from __future__ import annotations

import json
import os
from pathlib import Path

DATA_DIR = Path(os.getenv("META_ALERT_DATA_DIR", "/opt/meta-ads-cli/data/alerts"))


def read(path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


config = read(DATA_DIR / "config.json", {})
state = read(DATA_DIR / "state.json", {})
history = []
try:
    for line in (DATA_DIR / "history.jsonl").read_text(encoding="utf-8").splitlines()[-100:]:
        history.append(json.loads(line))
except Exception:
    pass

print(json.dumps({
    "config": config,
    "last_run": state.get("last_run"),
    "history": list(reversed(history)),
    "evolution_configured": bool(os.getenv("EVOLUTION_API_KEY") and config.get("evolution_instance") and config.get("evolution_group_jid")),
}, ensure_ascii=False))
