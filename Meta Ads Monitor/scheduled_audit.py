from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from validate_audit import validate


ROOT = Path(__file__).resolve().parent
TZ = ZoneInfo("America/Sao_Paulo")


def period(window: str) -> tuple[str, str]:
    today = datetime.now(TZ).date()
    if window == "today":
        start = end = today
    elif window == "yesterday":
        start = end = today - timedelta(days=1)
    else:
        end = today - timedelta(days=1)
        start = end - timedelta(days=89)
    return start.isoformat(), end.isoformat()


def configured_accounts(config: Path) -> list[str]:
    report = json.loads(config.read_text(encoding="utf-8"))
    accounts = [row["id"] for row in report.get("accounts", []) if row.get("id")]
    if not accounts or len(accounts) != len(set(accounts)):
        raise RuntimeError("A lista monitorada está vazia ou contém IDs duplicados.")
    return accounts


def main() -> int:
    parser = argparse.ArgumentParser(description="Coleta Meta Ads agendada com validação bloqueante.")
    parser.add_argument("--window", choices=("today", "yesterday", "90d"), default="today")
    parser.add_argument("--output-dir", type=Path, default=Path("/opt/meta-ads-cli/data/audits"))
    parser.add_argument("--accounts-config", type=Path, default=ROOT / "monitored_accounts.json")
    args = parser.parse_args()
    since, until = period(args.window)
    accounts = configured_accounts(args.accounts_config)
    def collect(account_ids: list[str]) -> dict:
        completed = subprocess.run([sys.executable, str(ROOT / "dashboard_spend.py"), since, until, *account_ids], check=True, capture_output=True, text=True)
        return json.loads(completed.stdout)

    payload = collect(accounts)
    for _ in range(2):
        failed = [account_id for account_id, row in payload.get("accounts", {}).items() if not row.get("reconciled")]
        if not failed:
            break
        time.sleep(30)
        retry = collect(failed)
        payload["accounts"].update(retry.get("accounts", {}))
    result = validate(payload, allow_pending_results=args.window == "today")
    timestamp = datetime.now(TZ).strftime("%Y%m%dT%H%M%S")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    snapshot = args.output_dir / f"{args.window}-{timestamp}.json"
    status = args.output_dir / f"{args.window}-latest-status.json"
    temp = snapshot.with_suffix(".tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    os.chmod(temp, 0o600)
    temp.replace(snapshot)
    status.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    os.chmod(status, 0o600)
    if result["ok"]:
        latest = args.output_dir / f"{args.window}-latest.json"
        latest_temp = latest.with_suffix(".tmp")
        latest_temp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        os.chmod(latest_temp, 0o600)
        latest_temp.replace(latest)
        try:
            sync = subprocess.run(
                [sys.executable, str(ROOT / "supabase_sync.py"), str(snapshot), "--window", args.window],
                check=True,
                capture_output=True,
                text=True,
                timeout=120,
            )
            result["supabase"] = json.loads(sync.stdout)
        except Exception as error:
            result["warnings"].append(f"Supabase: snapshot local preservado, mas a persistência remota falhou: {error}")
        status.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        os.chmod(status, 0o600)
    print(json.dumps({**result, "snapshot": str(snapshot)}, ensure_ascii=False))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
