"""Testes leves que não baixam modelos nem acessam hardware."""
import sys
import asyncio
import json
import queue
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.main import Application, is_question, listener_intent, merge_transcript_text, parse_live_script
from backend.audio_capture import AudioCapture
from backend.rag_engine import split_text
from backend.transcription import Transcriber


class SmokeTests(unittest.TestCase):
    def test_global_system_audio_is_disabled_by_default(self):
        capture = AudioCapture(queue.Queue())
        self.assertFalse(capture.capture_system)

    def test_question_detection(self):
        self.assertTrue(is_question("Qual é o prazo de entrega?"))
        self.assertFalse(is_question("Obrigado pela explicação."))
        self.assertFalse(is_question("Você tem experiência em projetos complexos."))
        self.assertEqual(listener_intent("Mas esse valor está muito caro."), "objecao")
        self.assertEqual(listener_intent("Qual é sua experiência com projetos?"), "pergunta")

    def test_cross_channel_echo_is_removed(self):
        application = Application()
        self.assertFalse(application.is_cross_channel_echo(
            "eu", "Essa é a mesma frase capturada pelo microfone", 10.0
        ))
        self.assertTrue(application.is_cross_channel_echo(
            "outro_lado", "Essa é a mesma frase capturada pelo microfone", 10.8
        ))
        self.assertFalse(application.is_cross_channel_echo(
            "outro_lado", "Qual é a sua experiência gerenciando projetos complexos?", 11.0
        ))

    def test_extension_audio_accepts_only_meeting_tab(self):
        class FakeSocket:
            def __init__(self, messages):
                self.messages = iter(messages)
                self.closed = None

            def __aiter__(self):
                return self

            async def __anext__(self):
                try:
                    return next(self.messages)
                except StopIteration:
                    raise StopAsyncIteration

            async def close(self, code=1000, reason=""):
                self.closed = (code, reason)

        async def scenario():
            application = Application()
            events = []

            async def capture(payload):
                events.append(payload)

            application.publish = capture
            samples = np.linspace(-.1, .1, 1600, dtype="<f4")
            packet = (16000).to_bytes(4, "little") + samples.tobytes()
            meeting = FakeSocket([
                json.dumps({
                    "tipo": "fonte",
                    "titulo": "Reunião de teste",
                    "url": "https://meet.google.com/abc-defg-hij",
                }),
                packet,
            ])
            await application.extension_audio_handler(meeting)
            chunk = application.audio_queue.get_nowait()
            self.assertEqual(chunk.speaker, "outro_lado")
            self.assertEqual(chunk.sample_rate, 16000)
            self.assertEqual(events[0]["estado"], "conectada")
            self.assertEqual(events[-1]["estado"], "desconectada")

            blocked = FakeSocket([json.dumps({
                "tipo": "fonte",
                "titulo": "Vídeo",
                "url": "https://www.youtube.com/watch?v=teste",
            })])
            await application.extension_audio_handler(blocked)
            self.assertEqual(blocked.closed[0], 1008)

        asyncio.run(scenario())

    def test_listener_question_triggers_assistance_in_presentation_mode(self):
        async def scenario():
            application = Application()
            application.mode = "apresentacao"
            application.transcript = [{
                "id": "fala-1",
                "falante": "outro_lado",
                "texto": "Qual é a sua experiência gerenciando projetos complexos?",
            }]
            calls = []

            async def answer(text, manual=False, detected_intent="pergunta"):
                calls.append((text, detected_intent))

            application.answer_question = answer
            application.schedule_listener_assistance("fala-1")
            await asyncio.sleep(.8)
            self.assertEqual(calls[0][1], "pergunta")

        asyncio.run(scenario())

    def test_chunks_overlap(self):
        chunks = split_text(" ".join(f"palavra{i}" for i in range(120)), size=120, overlap=25)
        self.assertGreater(len(chunks), 3)
        self.assertTrue(all(len(chunk) <= 130 for chunk in chunks))
        self.assertTrue(all(not chunk.startswith(" ") and not chunk.endswith(" ") for chunk in chunks))

    def test_transcript_overlap_is_consolidated(self):
        merged = merge_transcript_text(
            "Os cinco ramos controlam intenção e formato físico,",
            "formato físico, autenticação, registro e saída",
        )
        self.assertEqual(
            merged,
            "Os cinco ramos controlam intenção e formato físico, autenticação, registro e saída",
        )

    def test_sales_vocabulary_normalization(self):
        self.assertEqual(Transcriber._normalize_terms("captamos muitos lides no meta ads"), "captamos muitos leads no Meta Ads")

    def test_immediate_presentation_content(self):
        source = (
            "O centro é quebrar o silêncio. "
            "Os cinco ramos controlam intenção, formato, ética, registro e saída. "
            "Use um dado real do Lead Card."
        )
        self.assertIn("quebrar o silêncio", Application.immediate_guidance(source))
        self.assertTrue(Application.immediate_next_steps(source))

    def test_live_script_parser(self):
        now, following, later = parse_live_script(
            "AGORA: Esse primeiro contato precisa quebrar o silêncio com contexto real.\n"
            "DEPOIS: Mostre como registrar a tentativa no Lead Card.\n"
            "CONTINUA: Defina a próxima ação com clareza."
        )
        self.assertEqual(now, "Esse primeiro contato precisa quebrar o silêncio com contexto real.")
        self.assertEqual(following, "Mostre como registrar a tentativa no Lead Card.")
        self.assertEqual(later, "Defina a próxima ação com clareza.")

    def test_weak_presentation_script_is_rejected(self):
        self.assertFalse(
            Application.presentation_script_is_acceptable(
                "Entendi, vamos imaginar um cliente hipotético?",
                "Vou criar um exemplo de marketing.",
            )
        )
        now, following, later = Application.grounded_presentation_fallback(
            "O centro é quebrar o silêncio usando contexto real.",
            "O centro é quebrar o silêncio. Use um dado real do Lead Card. Registre a próxima ação.",
        )
        self.assertIn("quebrar o silêncio", now)
        self.assertTrue(following)
        self.assertTrue(later)
        self.assertFalse(
            Application.presentation_script_is_grounded(
                "O crédito é de R$ 10.000.",
                "Esse valor orienta o contato.",
                "Registre a próxima ação.",
                "Use um dado real do Lead Card, sem inventar valores.",
            )
        )

    def test_guidance_advance_keeps_next_field_filled(self):
        async def scenario():
            application = Application()
            application.last_guidance_now = "Fala atual para ser lida."
            application.last_guidance_next = "Segunda fala já preparada."
            application.last_guidance_later = "Terceira fala já preparada."
            application.last_source_text = (
                "Primeiro ponto factual do treinamento para continuar a apresentação. "
                "Segundo ponto factual do treinamento para manter a sequência."
            )
            events = []

            async def capture(payload):
                events.append(payload)

            application.publish = capture
            await application.advance_guidance()
            self.assertEqual(application.last_guidance_now, "Segunda fala já preparada.")
            self.assertEqual(application.last_guidance_next, "Terceira fala já preparada.")
            self.assertEqual(events[-1]["depois"], "Terceira fala já preparada.")
            await application.advance_guidance()
            self.assertTrue(application.last_guidance_next)
            self.assertTrue(events[-1]["depois"])

        asyncio.run(scenario())

    def test_guided_reading_detection(self):
        async def scenario():
            application = Application()
            application.guidance_locked = True
            application.last_guidance_now = (
                "O contexto real ajuda a quebrar o silêncio sem parecer uma mensagem automática"
            )
            events = []

            async def capture(payload):
                events.append(payload)

            application.publish = capture
            detected = await application.track_guided_reading(
                "O contexto real ajuda a quebrar o silêncio"
            )
            self.assertTrue(detected)
            self.assertEqual(events[-1]["tipo"], "leitura_guiada")
            self.assertGreater(events[-1]["progresso"], .4)

        asyncio.run(scenario())

    def test_guided_reading_is_continuous_with_asr_errors(self):
        async def scenario():
            application = Application()
            application.guidance_locked = True
            application.last_guidance_now = (
                "O ponto principal é retomar o contato com contexto real "
                "sem parecer uma mensagem automática para o cliente"
            )
            events = []

            async def capture(payload):
                events.append(payload)

            application.publish = capture
            chunks = [
                "o ponto principal e retomar",
                "contato com contesto real",
                "sem parecer mensagem automática",
                "para o cliente",
            ]
            progresses = []
            for chunk in chunks:
                await application.track_guided_reading(chunk)
                guided = [item for item in events if item["tipo"] == "leitura_guiada"]
                if guided:
                    progresses.append(guided[-1]["progresso"])
                    indices = guided[-1]["indices_lidos"]
                    self.assertEqual(indices, list(range(len(indices))))
            self.assertEqual(progresses, sorted(progresses))
            self.assertGreaterEqual(progresses[-1], .86)

        asyncio.run(scenario())


if __name__ == "__main__":
    unittest.main(verbosity=2)
