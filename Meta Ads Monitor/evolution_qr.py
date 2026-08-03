from __future__ import annotations

import argparse
import json
import os
import urllib.parse
import urllib.request


BASE = os.getenv("EVOLUTION_API_URL", "http://127.0.0.1:8080").rstrip("/")
KEY = os.getenv("EVOLUTION_API_KEY", "")


def request(path: str, method: str = "GET", payload: dict | None = None):
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        f"{BASE}{path}", data=body, method=method,
        headers={"apikey": KEY, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=40) as response:
        return json.load(response)


def create(instance: str):
    result = request("/instance/create", "POST", {
        "instanceName": instance,
        "qrcode": True,
        "integration": "WHATSAPP-BAILEYS",
    })
    return {
        "instance": instance,
        "state": (result.get("instance") or {}).get("status", "connecting"),
        "qr": (result.get("qrcode") or {}).get("base64"),
    }


def qr(instance: str):
    result = request(f"/instance/connect/{urllib.parse.quote(instance, safe='')}")
    return {
        "instance": instance,
        "qr": result.get("base64") or (result.get("qrcode") or {}).get("base64"),
        "pairing_code": result.get("pairingCode"),
    }


def status(instance: str):
    result = request(f"/instance/connectionState/{urllib.parse.quote(instance, safe='')}")
    state = (result.get("instance") or {}).get("state") or result.get("state") or "unknown"
    phone = ""
    if str(state).lower() in {"open", "connected"}:
        rows = request("/instance/fetchInstances")
        match = next((row for row in rows if (row.get("name") or (row.get("instance") or {}).get("instanceName")) == instance), {})
        owner = match.get("ownerJid") or (match.get("instance") or {}).get("owner") or ""
        phone = str(owner).split("@")[0].split(":")[0]
    return {"instance": instance, "state": state, "connected": str(state).lower() in {"open", "connected"}, "phone": phone}


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--create")
    group.add_argument("--qr")
    group.add_argument("--status")
    args = parser.parse_args()
    if not KEY:
        print(json.dumps({"error": "Evolution API não configurada"}, ensure_ascii=False))
        return 2
    try:
        result = create(args.create) if args.create else qr(args.qr) if args.qr else status(args.status)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as error:
        print(json.dumps({"error": str(error)[:300]}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
