"""Orquestrador do ciclo áudio → texto → RAG → LLM → overlay."""
from __future__ import annotations

import asyncio
import difflib
import hashlib
import json
import os
import queue
import re
import signal
import sys
import time
import unicodedata
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
import numpy as np
import websockets

ROOT = Path(__file__).resolve().parents[1]
BACKEND_VERSION = "1.1.0"
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from backend.audio_capture import AudioCapture, AudioChunk
from backend.llm_engine import LLMEngine
from backend.rag_engine import RAGEngine
from backend.transcription import Transcriber

QUESTION_WORDS = re.compile(
    r"\b(como|por que|porque|qual|quais|quanto|quando|onde|quem|posso|pode|"
    r"me fale|explique|conte sobre|gostaria de saber)\b",
    re.I,
)
OBJECTION_WORDS = re.compile(
    r"\b(mas|porém|caro|preço|valor|não concordo|não funciona|não tenho interesse|"
    r"sem orçamento|agora não|já tentei|problema|dúvida|receio|preocupad[oa])\b",
    re.I,
)


def is_question(text: str) -> bool:
    return bool(text.strip() and ("?" in text or QUESTION_WORDS.search(text)))


def listener_intent(text: str) -> str:
    if is_question(text):
        return "pergunta"
    if OBJECTION_WORDS.search(text):
        return "objecao"
    return "fala"


def merge_transcript_text(previous: str, current: str) -> str:
    """Une janelas consecutivas removendo a sobreposição de palavras do Whisper."""
    left, right = previous.split(), current.split()
    max_overlap = min(10, len(left), len(right))
    for size in range(max_overlap, 0, -1):
        if [word.casefold().strip(".,!?;:") for word in left[-size:]] == [
            word.casefold().strip(".,!?;:") for word in right[:size]
        ]:
            right = right[size:]
            break
    return " ".join(left + right).strip()


def next_stream_chunk(stream):
    try:
        return True, next(stream)
    except StopIteration:
        return False, ""


def parse_live_script(raw: str) -> tuple[str, str, str]:
    """Extrai a fila de três falas mesmo quando o modelo acrescenta markdown."""
    clean = raw.replace("**", "").strip()
    now_match = re.search(r"AGORA\s*:\s*(.*?)(?=DEPOIS\s*:|$)", clean, re.I | re.S)
    next_match = re.search(r"DEPOIS\s*:\s*(.*?)(?=CONTINUA\s*:|$)", clean, re.I | re.S)
    later_match = re.search(r"CONTINUA\s*:\s*(.*)$", clean, re.I | re.S)
    now_text = now_match.group(1).strip(' "\n') if now_match else clean.removeprefix("AGORA:").strip(' "\n')
    next_text = next_match.group(1).strip(' "\n') if next_match else ""
    later_text = later_match.group(1).strip(' "\n') if later_match else ""
    return now_text, next_text, later_text


def normalized_words(text: str) -> list[str]:
    text = unicodedata.normalize("NFKD", text.casefold())
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.findall(r"[a-z0-9]+", text)


class Application:
    def __init__(self):
        self.audio_queue: queue.Queue = queue.Queue(maxsize=30)
        self.clients: set = set()
        self.session_active = False
        self.session_started_at: float | None = None
        self.transcript: list[dict[str, str]] = []
        self.notes: list[str] = []
        self.mode = "vendas"
        self.assistant_instructions = ""
        self.last_transcript_at: dict[str, float] = {}
        self.recent_channel_text: dict[str, tuple[str, float]] = {}
        self.listener_response_task: asyncio.Task | None = None
        self.last_answered_listener_text = ""
        self.meeting_source: dict[str, str] | None = None
        self.last_coach_at = 0.0
        self.coach_lock = asyncio.Lock()
        self.pending_coach_text = ""
        self.last_guidance_now = ""
        self.last_guidance_next = ""
        self.last_guidance_later = ""
        self.last_source_text = ""
        self.source_sentence_cursor = 0
        self.guidance_locked = False
        self.guided_read_words: list[str] = []
        self.guided_read_position = 0
        self.guided_read_active = False
        self.guided_read_completed = False
        self.advance_task: asyncio.Task | None = None
        self.guidance_cache_path = ROOT / "data" / "guidance-cache.json"
        self.guidance_cache = self.load_guidance_cache()
        self.rag = None
        self.llm = None

    async def ws_handler(self, websocket):
        self.clients.add(websocket)
        try:
            await websocket.send(json.dumps({
                "tipo": "ready",
                "versao": BACKEND_VERSION,
                "capacidades": [
                    "streaming_apresentacao", "documento_ativo", "fala_agora",
                    "fala_depois", "captura_aba_isolada",
                ],
                "ativo": self.session_active,
                "texto": "Sessão em andamento" if self.session_active else "Pronto para iniciar",
            }, ensure_ascii=False))
            if self.meeting_source:
                await websocket.send(json.dumps({
                    "tipo": "fonte_reuniao",
                    "estado": "conectada",
                    **self.meeting_source,
                }, ensure_ascii=False))
            async for raw in websocket:
                try:
                    await self.handle_command(json.loads(raw))
                except (json.JSONDecodeError, KeyError) as exc:
                    await websocket.send(json.dumps({"tipo": "erro", "texto": f"Comando inválido: {exc}"}))
        finally:
            self.clients.discard(websocket)

    async def publish(self, payload: dict):
        if self.clients:
            message = json.dumps(payload, ensure_ascii=False)
            await asyncio.gather(*(client.send(message) for client in list(self.clients)), return_exceptions=True)

    async def handle_command(self, message: dict):
        command = message.get("comando")
        if command == "iniciar":
            self.session_active = True
            self.session_started_at = time.time()
            self.transcript = []
            self.notes = []
            self.recent_channel_text = {}
            self.last_answered_listener_text = ""
            if self.listener_response_task and not self.listener_response_task.done():
                self.listener_response_task.cancel()
            self.last_guidance_now = ""
            self.last_guidance_next = ""
            self.last_guidance_later = ""
            self.last_source_text = ""
            self.source_sentence_cursor = 0
            self.guidance_locked = False
            self.guided_read_words = []
            self.guided_read_position = 0
            self.guided_read_active = False
            self.guided_read_completed = False
            await self.publish({"tipo": "sessao", "estado": "ativa", "texto": "Ouvindo a reunião..."})
        elif command == "pausar":
            self.session_active = False
            await self.publish({"tipo": "sessao", "estado": "pausada", "texto": "Escuta pausada"})
        elif command == "retomar":
            self.session_active = True
            await self.publish({"tipo": "sessao", "estado": "ativa", "texto": "Ouvindo a reunião..."})
        elif command == "nota":
            note = str(message.get("texto", "")).strip()
            if note:
                self.notes.append(note)
                await self.publish({"tipo": "nota", "texto": note})
        elif command == "perguntar":
            question = str(message.get("texto", "")).strip()
            if question:
                await self.answer_question(question, manual=True)
        elif command == "modo":
            requested_mode = str(message.get("valor", "vendas"))
            if requested_mode in {"vendas", "objecoes", "reuniao", "apresentacao"}:
                self.mode = requested_mode
                await self.publish({"tipo": "modo", "valor": self.mode})
        elif command == "configurar":
            instructions = str(message.get("instrucoes", "")).strip()
            paths = [Path(value) for value in message.get("documentos", [])]
            await self.configure_assistant(instructions, paths)
        elif command == "diagnostico_apresentacao":
            # Comando local usado pelo smoke test ponta a ponta.
            spoken = str(message.get("texto", "")).strip()
            if spoken:
                await self.maybe_coach_presentation(spoken)
        elif command == "diagnostico_leitura_guiada":
            spoken = str(message.get("texto", "")).strip()
            if spoken:
                await self.track_guided_reading(spoken)
        elif command == "encerrar":
            await self.finish_session()

    async def configure_assistant(self, instructions: str, paths: list[Path]):
        if not instructions:
            await self.publish({"tipo": "erro_configuracao", "texto": "Adicione as instruções do assistente."})
            return
        if not paths and self.rag.collection.count() == 0:
            await self.publish({"tipo": "erro_configuracao", "texto": "Adicione pelo menos um PDF de treinamento."})
            return
        await self.publish({"tipo": "configurando", "texto": "Indexando os documentos..."})
        try:
            documents = []
            for path in paths:
                documents.append(await asyncio.to_thread(self.rag.add_pdf, path))
            self.assistant_instructions = instructions
            filenames = [item["nome"] for item in documents]
            if filenames:
                await self.prepare_guidance_cache(filenames)
            await self.publish({
                "tipo": "configurado",
                "texto": "Assistente preparado",
                "documentos": documents,
                "total_trechos": self.rag.collection.count(),
            })
            selected_name = documents[0]["nome"] if documents else (paths[0].name if paths else "")
            initial_source = await asyncio.to_thread(self.rag.first_source_for, selected_name)
            if initial_source:
                await self.publish({"tipo": "documento_pronto", **initial_source})
        except Exception as exc:
            print(f"[ERRO] configuração: {exc}")
            await self.publish({"tipo": "erro_configuracao", "texto": f"Não foi possível indexar: {exc}"})

    def load_guidance_cache(self) -> dict[str, list[str]]:
        try:
            return json.loads(self.guidance_cache_path.read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            return {}

    def guidance_cache_key(self, source: dict) -> str:
        digest = hashlib.sha1(str(source.get("trecho", "")).encode("utf-8")).hexdigest()[:12]
        return f"v3|{source.get('arquivo')}|{source.get('trecho_numero')}|{digest}"

    def save_guidance_cache(self) -> None:
        self.guidance_cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.guidance_cache_path.write_text(
            json.dumps(self.guidance_cache, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    async def prepare_guidance_cache(self, filenames: list[str]) -> None:
        sources = await asyncio.to_thread(self.rag.sources_for, filenames)
        missing = [source for source in sources if self.guidance_cache_key(source) not in self.guidance_cache]
        for position, source in enumerate(missing, 1):
            await self.publish({
                "tipo": "configurando",
                "texto": f"Preparando linguagem natural ({position}/{len(missing)})...",
            })
            try:
                stream = self.llm.stream_presentation_explanation(
                    "", source, self.assistant_instructions, "", ""
                )
                raw = ""
                while True:
                    has_chunk, chunk = await asyncio.to_thread(next_stream_chunk, stream)
                    if not has_chunk:
                        break
                    raw += chunk
                now_text, next_text, later_text = parse_live_script(raw)
                if (
                    self.presentation_script_is_acceptable(now_text, next_text)
                    and self.presentation_script_is_grounded(now_text, next_text, later_text, source["trecho"])
                    and later_text
                ):
                    self.guidance_cache[self.guidance_cache_key(source)] = [
                        now_text, next_text, later_text
                    ]
            except Exception as exc:
                print(f"[AVISO] preparação do trecho {source.get('trecho_numero')}: {exc}")
        if missing:
            await asyncio.to_thread(self.save_guidance_cache)

    async def answer_question(
        self, question: str, manual: bool = False, detected_intent: str = "pergunta"
    ):
        await self.publish({
            "tipo": "processando",
            "texto": "Analisando o contexto...",
            "pergunta": question,
            "intencao": detected_intent,
        })
        try:
            context = await asyncio.to_thread(self.rag.search, question)
            answer = await asyncio.to_thread(
                self.llm.generate,
                question,
                context,
                "objecoes" if detected_intent == "objecao" else self.mode,
                self.assistant_instructions,
            )
            await self.publish({
                "tipo": "resposta",
                "pergunta": question,
                "texto": answer,
                "manual": manual,
                "intencao": detected_intent,
            })
        except Exception as exc:
            print(f"[ERRO] geração de resposta: {exc}")
            await self.publish({"tipo": "erro", "texto": "Não foi possível gerar a resposta. Verifique o Ollama."})

    def is_cross_channel_echo(self, speaker: str, text: str, timestamp: float) -> bool:
        """Evita que vazamento acústico apareça como uma segunda pessoa."""
        normalized = " ".join(normalized_words(text))
        other = "outro_lado" if speaker == "eu" else "eu"
        previous = self.recent_channel_text.get(other)
        duplicate = False
        if previous and len(normalized) >= 12 and timestamp - previous[1] <= 1.8:
            other_text = previous[0]
            similarity = difflib.SequenceMatcher(None, normalized, other_text, autojunk=False).ratio()
            duplicate = similarity >= .84 or (
                len(normalized.split()) >= 4
                and (normalized in other_text or other_text in normalized)
            )
        if not duplicate:
            self.recent_channel_text[speaker] = (normalized, timestamp)
        return duplicate

    def schedule_listener_assistance(self, record_id: str) -> None:
        """Espera a frase do participante estabilizar antes de responder."""
        if self.listener_response_task and not self.listener_response_task.done():
            self.listener_response_task.cancel()
        self.listener_response_task = asyncio.create_task(
            self.respond_to_listener_after_pause(record_id)
        )

    async def respond_to_listener_after_pause(self, record_id: str) -> None:
        try:
            await asyncio.sleep(.7)
            record = next((item for item in reversed(self.transcript) if item["id"] == record_id), None)
            if not record:
                return
            text = record["texto"].strip()
            intent = listener_intent(text)
            if intent not in {"pergunta", "objecao"} or text == self.last_answered_listener_text:
                return
            self.last_answered_listener_text = text
            await self.publish({
                "tipo": "intencao_ouvinte",
                "intencao": intent,
                "texto": text,
            })
            await self.answer_question(text, detected_intent=intent)
        except asyncio.CancelledError:
            return

    async def maybe_coach_presentation(self, spoken_text: str):
        """Identifica o PDF em uso e oferece uma explicação curta sem esperar pergunta."""
        if self.guidance_locked:
            return
        if len(spoken_text) < 15 or time.monotonic() - self.last_coach_at < 1.25:
            return
        if self.coach_lock.locked():
            self.pending_coach_text = spoken_text
            return
        async with self.coach_lock:
            self.last_coach_at = time.monotonic()
            try:
                source = await asyncio.to_thread(self.rag.identify_source, spoken_text)
                if not source:
                    return
                self.last_source_text = str(source.get("trecho", ""))
                self.source_sentence_cursor = 0
                cached = self.guidance_cache.get(self.guidance_cache_key(source), [])
                if len(cached) == 3:
                    now_text, next_text, later_text = cached
                else:
                    now_text, next_text, later_text = self.grounded_presentation_fallback(
                        spoken_text, self.last_source_text
                    )
                self.last_guidance_now = now_text
                self.last_guidance_next = next_text
                self.last_guidance_later = later_text
                self.guidance_locked = True
                self.guided_read_words = []
                self.guided_read_position = 0
                self.guided_read_active = False
                self.guided_read_completed = False
                await self.publish({"tipo": "documento_identificado", **source})
                await self.publish({
                    "tipo": "orientacao_inicio",
                    "arquivo": source["arquivo"],
                    "trecho_numero": source["trecho_numero"],
                    "confianca": source["confianca"],
                    "agora": self.last_guidance_now,
                    "depois": self.last_guidance_next,
                })
                await self.publish({
                    "tipo": "orientacao_apresentacao",
                    "agora": self.last_guidance_now,
                    "depois": self.last_guidance_next,
                    "continua": self.last_guidance_later,
                    "arquivo": source["arquivo"],
                    "trecho_numero": source["trecho_numero"],
                    "confianca": source["confianca"],
                })
                # A fala aparece imediatamente. O modelo aquece fora do caminho
                # crítico e só melhora a reserva ainda não visível.
                asyncio.create_task(self.prefetch_guidance_reserve(spoken_text, source, now_text))
            except Exception as exc:
                print(f"[ERRO] acompanhamento da apresentação: {exc}")
        pending = self.pending_coach_text
        self.pending_coach_text = ""
        if pending and pending != spoken_text:
            asyncio.create_task(self.maybe_coach_presentation(pending))

    async def prefetch_guidance_reserve(self, spoken_text: str, source: dict, generation_now: str):
        try:
            stream = self.llm.stream_presentation_explanation(
                spoken_text, source, self.assistant_instructions,
                self.last_guidance_now, self.last_guidance_next,
            )
            accumulated_raw = ""
            while True:
                has_chunk, chunk = await asyncio.to_thread(next_stream_chunk, stream)
                if not has_chunk:
                    break
                accumulated_raw += chunk
            now_text, next_text, later_text = parse_live_script(accumulated_raw)
            if (
                self.last_guidance_now == generation_now
                and self.presentation_script_is_acceptable(now_text, next_text)
                and self.presentation_script_is_grounded(
                    now_text, next_text, later_text, str(source.get("trecho", ""))
                )
                and later_text
            ):
                self.last_guidance_later = later_text
        except Exception as exc:
            print(f"[AVISO] pré-geração da reserva: {exc}")

    async def track_guided_reading(self, spoken_text: str) -> bool:
        """Alinha fala incremental tolerando omissões e pequenas falhas do ASR."""
        if not self.guidance_locked or not self.last_guidance_now:
            return False
        target = normalized_words(self.last_guidance_now)
        incoming = normalized_words(spoken_text)
        if not target or not incoming:
            return False

        self.guided_read_words.extend(incoming)
        self.guided_read_words = self.guided_read_words[-12:]
        alignment_words = incoming if self.guided_read_active else self.guided_read_words
        cursor = self.guided_read_position
        search_start = max(0, cursor - 3)
        matches: list[int] = []
        for word in alignment_words:
            best_index, best_score = -1, 0.0
            search_end = min(len(target), max(cursor + 8, search_start + 8))
            for index in range(search_start, search_end):
                candidate = target[index]
                score = 1.0 if word == candidate else difflib.SequenceMatcher(
                    None, word, candidate, autojunk=False
                ).ratio()
                if min(len(word), len(candidate)) >= 5 and (
                    word.startswith(candidate[:4]) or candidate.startswith(word[:4])
                ):
                    score = max(score, .82)
                if score > best_score:
                    best_index, best_score = index, score
            if best_score >= .70:
                matches.append(best_index)
                search_start = best_index + 1
                cursor = max(cursor, best_index + 1)

        forward = [index for index in matches if index >= max(0, self.guided_read_position - 1)]
        if not self.guided_read_active:
            self.guided_read_active = len(forward) >= 2
        if not self.guided_read_active or not forward:
            return False

        self.guided_read_position = min(cursor, len(target))
        progress = self.guided_read_position / len(target)
        matched_indices = list(range(self.guided_read_position))
        await self.publish({
            "tipo": "leitura_guiada",
            "indices_lidos": matched_indices,
            "progresso": round(progress, 3),
            "total_palavras": len(target),
        })
        if progress >= .86 and not self.guided_read_completed:
            self.guided_read_completed = True
            await self.publish({"tipo": "leitura_guiada_concluida", "progresso": 1})
            if not self.advance_task or self.advance_task.done():
                self.advance_task = asyncio.create_task(self.advance_guidance())
        return True

    async def advance_guidance(self):
        await asyncio.sleep(.12)
        if self.last_guidance_next:
            self.last_guidance_now = self.last_guidance_next
            self.last_guidance_next = self.last_guidance_later
            self.last_guidance_later = self.next_grounded_reserve()
            if not self.last_guidance_next:
                self.last_guidance_next = self.last_guidance_later
                self.last_guidance_later = self.next_grounded_reserve()
            self.guided_read_words = []
            self.guided_read_position = 0
            self.guided_read_active = False
            self.guided_read_completed = False
            self.guidance_locked = True
            await self.publish({
                "tipo": "roteiro_avancado",
                "agora": self.last_guidance_now,
                "depois": self.last_guidance_next,
            })
        else:
            self.guidance_locked = False
            self.guided_read_words = []
            self.guided_read_position = 0
            self.guided_read_active = False
            self.guided_read_completed = False

    def next_grounded_reserve(self) -> str:
        """Mantém uma fala factual pronta enquanto a próxima é apresentada."""
        sentences = [
            sentence.strip()
            for sentence in re.split(r"(?<=[.!?])\s+", " ".join(self.last_source_text.split()))
            if self.source_sentence_is_clear(sentence)
        ]
        if not sentences:
            return ""
        sentence = sentences[self.source_sentence_cursor % len(sentences)]
        self.source_sentence_cursor += 1
        return f"Na sequência, {sentence[0].lower() + sentence[1:]}"[:240]

    @staticmethod
    def source_sentence_is_clear(sentence: str) -> bool:
        clean = sentence.strip()
        letters = [character for character in clean if character.isalpha()]
        uppercase_ratio = (
            sum(character.isupper() for character in letters) / len(letters)
            if letters else 1.0
        )
        looks_like_section_code = bool(re.match(r"^[A-Z]\d(?:\W|$)", clean))
        return (
            25 <= len(clean) <= 190
            and len(clean.split()) >= 5
            and uppercase_ratio < .42
            and not looks_like_section_code
        )

    @staticmethod
    def immediate_guidance(source_text: str) -> str:
        """Entrega conteúdo útil instantâneo enquanto a IA começa a transmitir."""
        clean = " ".join(source_text.split())
        sentences = re.split(r"(?<=[.!?])\s+", clean)
        useful = [sentence for sentence in sentences if len(sentence) > 25]
        return " ".join(useful[:2])[:280] or clean[:280]

    @staticmethod
    def immediate_next_steps(source_text: str) -> list[str]:
        clean = " ".join(source_text.split())
        sentences = [item.strip() for item in re.split(r"(?<=[.!?])\s+", clean) if len(item.strip()) > 20]
        return [f"Explique: {sentence[:72]}" for sentence in sentences[1:4]]

    @staticmethod
    def presentation_script_is_acceptable(now_text: str, next_text: str) -> bool:
        combined = f"{now_text} {next_text}".casefold()
        blocked = (
            "entendi",
            "vamos ",
            "vou ",
            "é importante",
            "podemos ",
            "reatuar",
            "hipotétic",
            "imagine que",
            "por exemplo",
            "o documento",
            "o trecho",
            "a leitura",
        )
        return (
            len(now_text.split()) >= 6
            and len(next_text.split()) >= 5
            and "?" not in combined
            and not any(term in combined for term in blocked)
        )

    @staticmethod
    def presentation_script_is_grounded(
        now_text: str, next_text: str, later_text: str, source_text: str
    ) -> bool:
        generated = f"{now_text} {next_text} {later_text}".casefold()
        source = source_text.casefold()
        generated_numbers = set(re.findall(r"\b\d[\d.,]*\b", generated))
        source_numbers = set(re.findall(r"\b\d[\d.,]*\b", source))
        return generated_numbers.issubset(source_numbers)

    @staticmethod
    def grounded_presentation_fallback(spoken_text: str, source_text: str) -> tuple[str, str, str]:
        """Produz falas imediatas somente a partir do texto limpo do estudo."""
        source = " ".join(source_text.split())
        sentences = [
            sentence.strip()
            for sentence in re.split(r"(?<=[.!?])\s+", source)
            if Application.source_sentence_is_clear(sentence)
        ]
        if not sentences:
            words = source.split()
            sentences = [" ".join(words[:28]), " ".join(words[28:56]), " ".join(words[56:84])]
            sentences = [sentence for sentence in sentences if sentence]
        first = sentences[0] if sentences else "Este ponto conecta a explicação ao objetivo apresentado."
        second = sentences[1] if len(sentences) > 1 else first
        third = sentences[2] if len(sentences) > 2 else second

        def lower_start(text: str) -> str:
            return text[:1].lower() + text[1:] if text else ""

        now_text = f"O ponto principal é o seguinte: {lower_start(first)}"
        next_text = f"Na sequência, {lower_start(second)}"
        later_text = f"Depois, {lower_start(third)}"
        return now_text[:260], next_text[:240], later_text[:240]

    async def finish_session(self):
        self.session_active = False
        await self.publish({"tipo": "processando", "texto": "Gerando notas e próximos passos..."})
        try:
            result = await asyncio.to_thread(self.llm.summarize_meeting, self.transcript, self.notes)
            saved_path = await asyncio.to_thread(self.save_session, result)
            await self.publish({
                "tipo": "encerramento",
                **result,
                "arquivo": saved_path.name,
                "texto": "Reunião finalizada",
            })
        except Exception as exc:
            print(f"[ERRO] encerramento da reunião: {exc}")
            await self.publish({"tipo": "erro", "texto": "A sessão terminou, mas o resumo não pôde ser gerado."})

    def save_session(self, result: dict) -> Path:
        history_dir = ROOT / "data" / "reunioes"
        history_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        path = history_dir / f"reuniao_{timestamp}.json"
        payload = {
            "iniciada_em": datetime.fromtimestamp(self.session_started_at or time.time()).isoformat(),
            "encerrada_em": datetime.now().isoformat(),
            "transcricao": self.transcript,
            "notas_manuais": self.notes,
            **result,
        }
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return path

    async def extension_audio_handler(self, websocket):
        """Recebe PCM apenas da aba de reunião autorizada pela extensão."""
        allowed_hosts = (
            "meet.google.com",
            "zoom.us",
            "teams.microsoft.com",
            "teams.live.com",
            "webex.com",
        )
        source: dict[str, str] | None = None
        try:
            async for raw in websocket:
                if isinstance(raw, str):
                    payload = json.loads(raw)
                    if payload.get("tipo") != "fonte":
                        continue
                    url = str(payload.get("url", ""))
                    hostname = (urlparse(url).hostname or "").casefold()
                    if not any(
                        hostname == host or hostname.endswith(f".{host}")
                        for host in allowed_hosts
                    ):
                        await websocket.close(code=1008, reason="A aba não é uma reunião compatível")
                        return
                    source = {
                        "nome": str(payload.get("titulo", "Reunião no navegador"))[:120],
                        "url": url[:300],
                        "origem": "aba_navegador",
                    }
                    self.meeting_source = source
                    await self.publish({
                        "tipo": "fonte_reuniao",
                        "estado": "conectada",
                        **source,
                    })
                    continue
                if not source or len(raw) < 8:
                    continue
                sample_rate = int.from_bytes(raw[:4], "little", signed=False)
                if sample_rate < 8000 or sample_rate > 192000:
                    continue
                samples = np.frombuffer(raw, dtype="<f4", offset=4).copy()
                if not samples.size or samples.size > sample_rate * 2:
                    continue
                chunk = AudioChunk("outro_lado", samples, sample_rate, time.time())
                try:
                    self.audio_queue.put_nowait(chunk)
                except queue.Full:
                    try:
                        self.audio_queue.get_nowait()
                        self.audio_queue.put_nowait(chunk)
                    except queue.Empty:
                        pass
        except (json.JSONDecodeError, websockets.ConnectionClosed):
            pass
        finally:
            if source and self.meeting_source == source:
                self.meeting_source = None
                await self.publish({
                    "tipo": "fonte_reuniao",
                    "estado": "desconectada",
                    "nome": source["nome"],
                    "origem": "aba_navegador",
                })

    async def run(self):
        self.rag = RAGEngine(ROOT / "knowledge_base")
        self.rag.index_all()
        observer = self.rag.watch()
        transcriber = Transcriber(
            os.getenv("WHISPER_MODEL", "base"),
            os.getenv("IDIOMA", "pt"),
            os.getenv("VOCABULARIO", "Hurtz, lead, leads, tráfego pago, Meta Ads, CRM, funil, conversão"),
        )
        self.llm = LLMEngine()
        # O mix global do Windows permanece desativado. O canal remoto só pode
        # entrar pela extensão, que captura uma aba explicitamente selecionada.
        capture = AudioCapture(self.audio_queue, capture_system=False)
        host, port = os.getenv("WS_HOST", "127.0.0.1"), int(os.getenv("WS_PORT", "8765"))
        audio_port = int(os.getenv("AUDIO_WS_PORT", "8766"))
        async with (
            websockets.serve(self.ws_handler, host, port),
            websockets.serve(
                self.extension_audio_handler,
                host,
                audio_port,
                max_size=2 * 1024 * 1024,
            ),
        ):
            print(f"[OK] WebSocket ativo em ws://{host}:{port}")
            print(f"[OK] Áudio isolado da extensão em ws://{host}:{audio_port}")
            capture.start()
            try:
                while True:
                    chunk = await asyncio.to_thread(self.audio_queue.get)
                    if not self.session_active:
                        continue
                    item = await asyncio.to_thread(transcriber.transcribe, chunk.samples, chunk.speaker, chunk.sample_rate)
                    text = item["texto"]
                    if text:
                        now = time.monotonic()
                        if self.is_cross_channel_echo(item["falante"], text, now):
                            print(f"[ECO IGNORADO] {item['falante']}: {text}")
                            continue
                        print(f"[TRANSCRIÇÃO] {item['falante']}: {text}")
                        intent = (
                            "usuario"
                            if item["falante"] == "eu"
                            else listener_intent(text)
                        )
                        can_merge = (
                            self.transcript
                            and self.transcript[-1]["falante"] == item["falante"]
                            and now - self.last_transcript_at.get(item["falante"], 0) < 9
                        )
                        if can_merge:
                            record = self.transcript[-1]
                            record["texto"] = merge_transcript_text(record["texto"], text)
                            record["horario"] = datetime.now().strftime("%H:%M:%S")
                            record["intencao"] = (
                                "usuario"
                                if item["falante"] == "eu"
                                else listener_intent(record["texto"])
                            )
                            await self.publish({"tipo": "transcricao_atualizada", **record})
                        else:
                            record = {
                                "id": f"fala-{len(self.transcript) + 1}",
                                "falante": item["falante"],
                                "texto": text,
                                "horario": datetime.now().strftime("%H:%M:%S"),
                                "origem": "microfone" if item["falante"] == "eu" else "audio_sistema",
                                "intencao": intent,
                            }
                            self.transcript.append(record)
                            await self.publish({"tipo": "transcricao", **record})
                        self.last_transcript_at[item["falante"]] = now
                        if item["falante"] == "eu":
                            reading_guidance = await self.track_guided_reading(text)
                            if not reading_guidance:
                                asyncio.create_task(self.maybe_coach_presentation(record["texto"]))
                        else:
                            self.schedule_listener_assistance(record["id"])
            finally:
                capture.stop()
                observer.stop()
                observer.join(timeout=2)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    asyncio.run(Application().run())
