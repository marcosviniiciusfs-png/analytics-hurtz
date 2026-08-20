"""Captura simultânea do microfone e do áudio de saída em blocos rotulados."""
from __future__ import annotations

import platform
import queue
import threading
import time
from dataclasses import dataclass

import numpy as np


@dataclass
class AudioChunk:
    speaker: str
    samples: np.ndarray
    sample_rate: int
    timestamp: float


class AudioCapture:
    def __init__(
        self,
        output: queue.Queue,
        sample_rate: int = 16000,
        chunk_seconds: float = 1.0,
        capture_system: bool = False,
    ):
        self.output = output
        self.sample_rate = sample_rate
        self.frames = int(sample_rate * chunk_seconds)
        self.capture_system = capture_system
        self.stop_event = threading.Event()
        self.threads: list[threading.Thread] = []

    def start(self) -> None:
        self.stop_event.clear()
        self.threads = [
            threading.Thread(target=self._capture_microphone, daemon=True, name="microfone"),
        ]
        if self.capture_system:
            self.threads.append(
                threading.Thread(target=self._capture_system, daemon=True, name="audio-sistema")
            )
        for thread in self.threads:
            thread.start()
        detail = "microfone + sistema" if self.capture_system else "somente microfone; reunião via extensão"
        print(f"[OK] Captura de áudio iniciada ({detail})")

    def stop(self) -> None:
        self.stop_event.set()
        for thread in self.threads:
            thread.join(timeout=2)

    def _capture_microphone(self) -> None:
        try:
            import sounddevice as sd
            while not self.stop_event.is_set():
                data = sd.rec(self.frames, samplerate=self.sample_rate, channels=1, dtype="float32")
                sd.wait()
                self.output.put(AudioChunk("eu", data[:, 0].copy(), self.sample_rate, time.time()))
        except Exception as exc:
            print(f"[ERRO] microfone não encontrado: {exc}")

    def _capture_system(self) -> None:
        if platform.system() == "Windows":
            self._capture_windows_loopback()
        else:
            self._capture_blackhole()

    def _capture_windows_loopback(self) -> None:
        try:
            import pyaudiowpatch as pyaudio
            with pyaudio.PyAudio() as audio:
                device = audio.get_default_wasapi_loopback()
                rate = int(device["defaultSampleRate"])
                stream = audio.open(format=pyaudio.paFloat32, channels=device["maxInputChannels"],
                                    rate=rate, input=True, input_device_index=device["index"],
                                    frames_per_buffer=rate)
                while not self.stop_event.is_set():
                    raw = stream.read(rate, exception_on_overflow=False)
                    samples = np.frombuffer(raw, dtype=np.float32).reshape(-1, device["maxInputChannels"]).mean(axis=1)
                    self.output.put(AudioChunk("outro_lado", samples, rate, time.time()))
        except Exception as exc:
            print(f"[ERRO] áudio de sistema/WASAPI indisponível: {exc}")

    def _capture_blackhole(self) -> None:
        try:
            import sounddevice as sd
            devices = sd.query_devices()
            index = next(i for i, d in enumerate(devices) if "blackhole" in d["name"].lower())
            while not self.stop_event.is_set():
                data = sd.rec(self.frames, samplerate=self.sample_rate, channels=1, dtype="float32", device=index)
                sd.wait()
                self.output.put(AudioChunk("outro_lado", data[:, 0].copy(), self.sample_rate, time.time()))
        except Exception as exc:
            print("[INTERVENÇÃO HUMANA NECESSÁRIA] Instale o BlackHole 2ch: https://github.com/ExistentialAudio/BlackHole")
            print(f"[ERRO] BlackHole não encontrado: {exc}")
