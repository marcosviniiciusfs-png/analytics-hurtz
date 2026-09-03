"""Geração de respostas via Ollama local; APIs externas permanecem opcionais."""
from __future__ import annotations

import os
import requests


class LLMEngine:
    def __init__(self):
        self.model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
        self.use_api = os.getenv("USE_API", "false").lower() == "true"
        self.provider = os.getenv("API_PROVIDER", "openai").lower()

    def generate(
        self,
        question: str,
        context: list[str],
        mode: str = "vendas",
        assistant_instructions: str = "",
    ) -> str:
        mode_instruction = {
            "vendas": "Ajude o vendedor a responder com clareza, segurança e foco em valor.",
            "objecoes": "Identifique a objeção e sugira uma resposta empática, curta e convincente.",
            "reuniao": "Priorize precisão, decisões e próximos passos.",
            "apresentacao": "Ajude o apresentador com explicações claras, curtas e fáceis de falar.",
        }.get(mode, "Responda de forma útil e direta.")
        prompt = f"""Você é o Assistente de Reunião Hurtz, um apoio de treinamento de vendas.
Responda em português, naturalmente, de forma direta e em no máximo 5 frases.
Use somente o contexto quando ele trouxer a resposta; se faltar informação, diga isso com clareza.
Modo ativo: {mode}. {mode_instruction}
Instruções específicas definidas pelo usuário:
{assistant_instructions or "Use as instruções padrão da Hurtz."}

Contexto do treinamento:
{chr(10).join(context) if context else 'Nenhum material relevante foi encontrado.'}

Pergunta:
{question}

Resposta sugerida:"""
        if self.use_api:
            return self._generate_api(prompt)
        response = requests.post("http://127.0.0.1:11434/api/generate",
                                 json={"model": self.model, "prompt": prompt, "stream": False}, timeout=120)
        response.raise_for_status()
        return response.json()["response"].strip()

    def generate_presentation_guidance(
        self,
        spoken_text: str,
        source: dict[str, object],
        assistant_instructions: str,
    ) -> dict[str, object]:
        prompt = f"""Você é um copiloto de apresentação da Hurtz.
O apresentador está lendo ou explicando um documento.
Devolva SOMENTE JSON válido neste formato:
{{"explicacao":"até 2 frases curtas que ele pode dizer agora","proximos_passos":["até 3 ações curtas"]}}
Explique o significado com clareza, não repita literalmente o que já foi lido e não invente informações.
Os próximos passos devem orientar a continuação imediata da apresentação, não tarefas pós-reunião.

Documento identificado: {source.get("arquivo")}
Trecho de referência: {source.get("trecho")}
Fala recente: {spoken_text}
Instruções do usuário: {assistant_instructions}

JSON:"""
        import json
        raw = self._generate_api(prompt) if self.use_api else self._complete(prompt)
        try:
            data = json.loads(raw)
            return {
                "explicacao": str(data.get("explicacao", "")).strip(),
                "proximos_passos": [
                    str(item).strip() for item in data.get("proximos_passos", []) if str(item).strip()
                ][:3],
            }
        except (json.JSONDecodeError, TypeError):
            return {"explicacao": raw.strip(), "proximos_passos": []}

    def stream_presentation_explanation(
        self,
        spoken_text: str,
        source: dict[str, object],
        assistant_instructions: str,
        previous_now: str = "",
        previous_next: str = "",
    ):
        """Emite pequenos blocos assim que o Ollama os produz."""
        prompt = f"""Você é o ponto eletrônico de um apresentador da Hurtz.
Escreva uma continuação que soe como fala espontânea brasileira, não como resumo de IA.
Conecte naturalmente com o que acabou de ser falado. Não mencione documento, trecho, leitura ou assistente.
Não use frases como "é importante", "o documento aborda", "vamos trabalhar juntos" ou explicações genéricas.
Não faça perguntas retóricas, não use exclamações e não comece com "entendi", "vamos" ou "vou".
Use exclusivamente os fatos do trecho. Não crie exemplos, números, resultados, clientes ou promessas.
Preserve o significado dos termos comerciais. Cada fala deve ter no máximo 28 palavras.
Responda exatamente em três linhas:
AGORA: fala natural para dizer imediatamente
DEPOIS: próxima fala que continua o raciocínio
CONTINUA: fala posterior que mantém a sequência

Exemplo de estilo:
AGORA: Na prática, o objetivo é retomar o contato com contexto real, sem parecer uma mensagem automática.
DEPOIS: Em seguida, registre a tentativa e deixe definida a próxima ação.
CONTINUA: Com isso registrado, o acompanhamento ganha contexto e uma ação objetiva.

Documento: {source.get("arquivo")}
Trecho: {source.get("trecho")}
Fala atual: {spoken_text}
Última sugestão exibida: {previous_now}
Continuação anterior: {previous_next}
Instruções: {assistant_instructions}

Resposta:"""
        if self.use_api:
            yield self._generate_api(prompt)
            return
        with requests.post(
            "http://127.0.0.1:11434/api/generate",
            json={
                "model": self.model,
                "prompt": prompt,
                "stream": True,
                "keep_alive": "30m",
                "options": {"temperature": 0.15, "num_predict": 115, "num_ctx": 2048},
            },
            timeout=120,
            stream=True,
        ) as response:
            response.raise_for_status()
            import json
            for line in response.iter_lines():
                if not line:
                    continue
                payload = json.loads(line)
                chunk = payload.get("response", "")
                if chunk:
                    yield chunk
                if payload.get("done"):
                    break

    def generate_presentation_next_steps(
        self,
        spoken_text: str,
        source: dict[str, object],
    ) -> list[str]:
        prompt = f"""Com base no trecho e na fala atual, indique os próximos passos imediatos da apresentação.
Responda SOMENTE JSON válido: {{"proximos_passos":["ação 1","ação 2","ação 3"]}}
Cada ação deve ter até 8 palavras e orientar o que explicar em seguida.

Trecho: {source.get("trecho")}
Fala atual: {spoken_text}
"""
        import json
        raw = self._generate_api(prompt) if self.use_api else self._complete(prompt)
        try:
            return [
                str(item).strip()
                for item in json.loads(raw).get("proximos_passos", [])
                if str(item).strip()
            ][:3]
        except (json.JSONDecodeError, TypeError):
            return []

    def summarize_meeting(self, transcript: list[dict[str, str]], notes: list[str]) -> dict[str, object]:
        """Gera encerramento estruturado sem depender de serviços externos."""
        conversation = "\n".join(
            f"{item.get('falante', 'participante')}: {item.get('texto', '')}"
            for item in transcript[-120:]
        )
        manual_notes = "\n".join(f"- {note}" for note in notes) or "- Nenhuma nota manual."
        prompt = f"""Você é um assistente de reuniões comerciais da Hurtz.
Analise a conversa e devolva SOMENTE JSON válido, sem markdown, no formato:
{{"resumo":"texto curto","notas":["ponto importante"],"proximos_passos":["ação objetiva"]}}

Transcrição:
{conversation or "Nenhuma transcrição disponível."}

Notas manuais:
{manual_notes}
"""
        raw = self._complete(prompt)
        import json
        try:
            data = json.loads(raw)
            return {
                "resumo": str(data.get("resumo", "")).strip(),
                "notas": [str(item).strip() for item in data.get("notas", []) if str(item).strip()],
                "proximos_passos": [
                    str(item).strip() for item in data.get("proximos_passos", []) if str(item).strip()
                ],
            }
        except (json.JSONDecodeError, TypeError):
            return {
                "resumo": raw.strip(),
                "notas": notes,
                "proximos_passos": ["Revisar o resumo e definir os responsáveis pelas ações."],
            }

    def _complete(self, prompt: str) -> str:
        if self.use_api:
            return self._generate_api(prompt)
        response = requests.post(
            "http://127.0.0.1:11434/api/generate",
            json={"model": self.model, "prompt": prompt, "stream": False, "format": "json"},
            timeout=180,
        )
        response.raise_for_status()
        return response.json()["response"].strip()

    def _generate_api(self, prompt: str) -> str:
        if self.provider == "anthropic":
            key = os.getenv("ANTHROPIC_API_KEY", "")
            if not key:
                raise RuntimeError("[INTERVENÇÃO HUMANA NECESSÁRIA] ANTHROPIC_API_KEY está vazia")
            response = requests.post("https://api.anthropic.com/v1/messages", headers={
                "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"
            }, json={"model": os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
                     "max_tokens": 450, "messages": [{"role": "user", "content": prompt}]}, timeout=120)
            response.raise_for_status()
            return response.json()["content"][0]["text"].strip()
        key = os.getenv("OPENAI_API_KEY", "")
        if not key:
            raise RuntimeError("[INTERVENÇÃO HUMANA NECESSÁRIA] OPENAI_API_KEY está vazia")
        response = requests.post("https://api.openai.com/v1/responses", headers={
            "Authorization": f"Bearer {key}", "Content-Type": "application/json"
        }, json={"model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"), "input": prompt}, timeout=120)
        response.raise_for_status()
        return response.json()["output"][0]["content"][0]["text"].strip()
