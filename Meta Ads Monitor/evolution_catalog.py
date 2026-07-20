from __future__ import annotations

import argparse
import json
import os
import re
import urllib.parse
import urllib.request


BASE = os.getenv("EVOLUTION_API_URL", "http://127.0.0.1:8080").rstrip("/")
KEY = os.getenv("EVOLUTION_API_KEY", "")


def get(path: str):
    request = urllib.request.Request(f"{BASE}{path}", headers={"apikey": KEY})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def instances(phone: str) -> dict:
    wanted = digits(phone)
    rows = []
    for item in get("/instance/fetchInstances"):
        owner = item.get("ownerJid") or item.get("instance", {}).get("owner") or ""
        number = digits(owner.split("@")[0])
        if wanted and number != wanted:
            continue
        rows.append({
            "instance": item.get("name") or item.get("instance", {}).get("instanceName"),
            "phone": number,
            "connected": (item.get("connectionStatus") or item.get("instance", {}).get("status")) == "open",
        })
    return {"found": bool(rows), "instances": rows}


def groups(instance: str) -> dict:
    safe = urllib.parse.quote(instance, safe="")
    payload = get(f"/group/fetchAllGroups/{safe}?getParticipants=false")
    rows = []
    for item in payload if isinstance(payload, list) else payload.get("data", []):
        jid = item.get("id") or item.get("jid")
        if jid:
            rows.append({"id": jid, "name": item.get("subject") or item.get("name") or jid})
    return {"groups": sorted(rows, key=lambda row: row["name"].casefold())}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phone")
    parser.add_argument("--groups")
    args = parser.parse_args()
    if not KEY:
        print(json.dumps({"error": "Evolution API não configurada"}, ensure_ascii=False))
        return 2
    try:
        result = groups(args.groups) if args.groups else instances(args.phone or "")
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as error:
        print(json.dumps({"error": str(error)[:240]}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
