import base64
import json
import os
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
API_URL = CONFIG["api_url"].rstrip("/")
TOKEN = CONFIG["token"]
MODEL = CONFIG.get("model", "qwen2.5vl:3b")
OLLAMA_URL = CONFIG.get("ollama_url", "http://127.0.0.1:11434").rstrip("/")
POLL_SECONDS = max(2, int(CONFIG.get("poll_seconds", 5)))


def api(path, method="GET", payload=None, timeout=120):
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        API_URL + path,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read() or b"{}")


def ensure_ollama():
    try:
        urllib.request.urlopen(OLLAMA_URL + "/api/version", timeout=3)
        return
    except Exception:
        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags)
        for _ in range(30):
            try:
                urllib.request.urlopen(OLLAMA_URL + "/api/version", timeout=2)
                return
            except Exception:
                time.sleep(1)
    raise RuntimeError("Ollama não iniciou")


def download_video(job, destination):
    media_url = job["media_url"]
    if not media_url.startswith("http"):
        media_url = API_URL + media_url
    request = urllib.request.Request(media_url, headers={"Authorization": f"Bearer {TOKEN}"})
    with urllib.request.urlopen(request, timeout=180) as response, open(destination, "wb") as output:
        shutil.copyfileobj(response, output, length=1024 * 1024)


def extract_frames(video, directory):
    output = str(Path(directory) / "frame-%02d.jpg")
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(video),
        "-vf", "fps=1/5,scale=640:-2", "-frames:v", "6", "-q:v", "3", output,
    ]
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    subprocess.run(command, check=True, timeout=150, creationflags=flags)
    frames = sorted(Path(directory).glob("frame-*.jpg"))
    if not frames:
        raise RuntimeError("Nenhum quadro foi extraído")
    return frames


def analyze(job, frames):
    expected = job["expected_type"]
    label = "carro, veículo, moto ou caminhão" if expected == "car" else "imóvel, casa, apartamento, terreno ou construção"
    prompt = (
        f"Analise estes quadros do mesmo vídeo. O conteúdo esperado é {label}. "
        "Aprove somente se o produto aparece claramente em pelo menos metade dos quadros e é o assunto visual principal. "
        "Rejeite pessoa apenas falando, texto, meme, reação, paisagem ou produto apenas ao fundo. "
        f'Responda JSON com relevant (boolean), detected_type ("{expected}" ou "other"), '
        'confidence (0 a 1) e reason (frase curta em português).'
    )
    images = [base64.b64encode(frame.read_bytes()).decode() for frame in frames]
    schema = {
        "type": "object",
        "properties": {
            "relevant": {"type": "boolean"},
            "detected_type": {"type": "string", "enum": [expected, "other"]},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            "reason": {"type": "string"},
        },
        "required": ["relevant", "detected_type", "confidence", "reason"],
    }
    body = {
        "model": MODEL,
        "stream": False,
        "format": schema,
        "keep_alive": "5m",
        "options": {"temperature": 0, "num_predict": 180},
        "messages": [{"role": "user", "content": prompt, "images": images}],
    }
    request = urllib.request.Request(
        OLLAMA_URL + "/api/chat", data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(request, timeout=240) as response:
        result = json.loads(response.read())
    return json.loads(result["message"]["content"])


def work(job):
    started = time.time()
    with tempfile.TemporaryDirectory(prefix="hurtz-creative-") as temporary:
        video = Path(temporary) / "video.mp4"
        download_video(job, video)
        frames = extract_frames(video, temporary)
        result = analyze(job, frames)
    result["job_id"] = job["id"]
    api("/api/creative-audit/agent/result", "POST", result, timeout=30)
    print(f"[{time.strftime('%H:%M:%S')}] {job['id']} analisado em {round(time.time()-started)}s: {result.get('relevant')}", flush=True)


def main():
    ensure_ollama()
    print("Hurtz Creative Analyzer conectado. Aguardando vídeos...", flush=True)
    last_heartbeat = 0
    while True:
        try:
            if time.time() - last_heartbeat > 20:
                api("/api/creative-audit/agent/heartbeat", "POST", {}, timeout=15)
                last_heartbeat = time.time()
            response = api("/api/creative-audit/agent/claim", "POST", {}, timeout=30)
            if response.get("job"):
                work(response["job"])
            else:
                time.sleep(POLL_SECONDS)
        except KeyboardInterrupt:
            break
        except Exception as error:
            print(f"[{time.strftime('%H:%M:%S')}] Falha temporária: {error}", flush=True)
            time.sleep(10)


if __name__ == "__main__":
    main()
