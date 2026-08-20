"""Validação manual da latência e do formato do teleprompter local."""
import time
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.llm_engine import LLMEngine
from backend.main import parse_live_script

source = {
    "arquivo": "Hurtz Follow-up.pdf",
    "trecho": (
        "O centro é quebrar o silêncio. Use um dado real do Lead Card. "
        "Os cinco ramos controlam intenção, formato, ética, registro e saída."
    ),
}
start = time.perf_counter()
first_chunk = None
raw = ""
chunks = 0

stream = LLMEngine().stream_presentation_explanation(
    "O centro é quebrar o silêncio e usar contexto real do lead.",
    source,
    "Fale como um treinador comercial brasileiro, com naturalidade.",
)
for chunk in stream:
    raw += chunk
    chunks += 1
    first_chunk = first_chunk or time.perf_counter() - start

now_text, next_text, later_text = parse_live_script(raw)
total = time.perf_counter() - start
print(f"primeiro_bloco={first_chunk:.2f}s total={total:.2f}s blocos={chunks}")
print("AGORA=", now_text)
print("DEPOIS=", next_text)
print("CONTINUA=", later_text)
assert first_chunk < 5, "O primeiro bloco demorou mais de 5 segundos"
assert now_text and next_text and later_text, "As três falas não foram geradas"
print("[OK] streaming, latência e três falas validados")
