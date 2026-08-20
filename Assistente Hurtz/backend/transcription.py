"""Transcrição local com janela deslizante por canal."""
from __future__ import annotations

import re
import numpy as np

DEFAULT_VOCABULARY = (
    "Hurtz, lead, leads, tráfego pago, Meta Ads, CRM, funil de vendas, "
    "conversão, copy, landing page, remarketing, prospecção, objeção, follow-up"
)


class Transcriber:
    def __init__(self, model_name: str = "base", language: str = "pt", vocabulary: str = DEFAULT_VOCABULARY):
        import torch
        from faster_whisper import WhisperModel
        use_cuda = torch.cuda.is_available()
        self.language = language
        self.vocabulary = vocabulary
        self.model = WhisperModel(model_name, device="cuda" if use_cuda else "cpu",
                                  compute_type="float16" if use_cuda else "int8")
        self.buffers: dict[str, np.ndarray] = {}
        print(f"[OK] Whisper {model_name} carregado em {'GPU' if use_cuda else 'CPU'}")

    def transcribe(self, samples: np.ndarray, speaker: str, sample_rate: int) -> dict[str, str]:
        current = self.buffers.get(speaker, np.array([], dtype=np.float32))
        current = np.concatenate((current, samples.astype(np.float32)))
        # Cinco segundos preservam frases curtas completas sem elevar demais a latência.
        window = int(sample_rate * 1.0)
        if current.size < window:
            self.buffers[speaker] = current
            return {"falante": speaker, "texto": ""}
        audio = current[-window:]
        self.buffers[speaker] = current[-int(sample_rate * .15):]
        rms = float(np.sqrt(np.mean(np.square(audio), dtype=np.float64)))
        if rms < 0.003:
            return {"falante": speaker, "texto": ""}
        segments, _ = self.model.transcribe(
            audio,
            language=self.language,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 220},
            beam_size=1,
            best_of=1,
            initial_prompt=f"Vocabulário esperado: {self.vocabulary}.",
            condition_on_previous_text=False,
        )
        reliable_segments = [
            segment.text.strip()
            for segment in segments
            if getattr(segment, "no_speech_prob", 0) < .65
            and getattr(segment, "avg_logprob", 0) > -1.15
        ]
        text = " ".join(reliable_segments).strip()
        return {"falante": speaker, "texto": self._normalize_terms(text)}

    @staticmethod
    def _normalize_terms(text: str) -> str:
        """Corrige variantes fonéticas frequentes sem reescrever a frase."""
        replacements = {
            r"\blide\b": "lead",
            r"\blides\b": "leads",
            r"\blíderes\b(?=\s+(?:qualificados|captados|gerados))": "leads",
            r"\bmeta ads\b": "Meta Ads",
            r"\bcrm\b": "CRM",
            r"\bhurts\b": "Hurtz",
        }
        for pattern, replacement in replacements.items():
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        return text.strip()
