from __future__ import annotations

import argparse
import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw or raw.lstrip().startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def request(table: str, rows: list[dict], conflict: str | None = None) -> None:
    if not rows:
        return
    base = os.environ["SUPABASE_URL"].rstrip("/")
    secret = os.environ["SUPABASE_SECRET_KEY"]
    query = f"?on_conflict={urllib.parse.quote(conflict)}" if conflict else ""
    for offset in range(0, len(rows), 500):
        batch = rows[offset:offset + 500]
        req = urllib.request.Request(
            f"{base}/rest/v1/{table}{query}",
            data=json.dumps(batch, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
            method="POST",
            headers={
                "apikey": secret,
                "Authorization": f"Bearer {secret}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                if response.status not in (200, 201, 204):
                    raise RuntimeError(f"Supabase respondeu HTTP {response.status} em {table}.")
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:500]
            raise RuntimeError(f"Falha no Supabase/{table}: HTTP {error.code}: {detail}") from error


def metric_number(value):
    return None if value is None else value


def sync(payload_path: Path, window: str, plans_path: Path | None = None) -> dict:
    raw = payload_path.read_bytes()
    payload = json.loads(raw)
    accounts = payload.get("accounts") or {}
    since = payload.get("since") or payload.get("date_from")
    until = payload.get("until") or payload.get("date_to")
    if not since or not until:
        raise RuntimeError("O snapshot não informa o período consultado.")
    run_id = str(uuid.uuid4())
    reconciled = sum(1 for row in accounts.values() if row.get("reconciled"))
    warnings = [f"{account_id}: não reconciliada" for account_id, row in accounts.items() if not row.get("reconciled")]
    request("audit_runs", [{
        "id": run_id,
        "window_type": window,
        "date_from": since,
        "date_to": until,
        "status": "reconciled" if reconciled == len(accounts) else "partial",
        "requested_accounts": len(accounts),
        "reconciled_accounts": reconciled,
        "payload_sha256": hashlib.sha256(raw).hexdigest(),
        "warnings": warnings,
        "errors": [],
    }])
    account_rows = []
    for account_id, row in accounts.items():
        account_rows.append({
            "id": account_id,
            "name": row.get("name") or account_id,
            "currency": row.get("currency") or "BRL",
            "timezone": "America/Sao_Paulo",
            "meta_status": str(row.get("account_status") or ""),
            "is_monitored": True,
        })
    request("ad_accounts", account_rows, "id")
    plan_rows = []
    if plans_path and plans_path.exists():
        saved = json.loads(plans_path.read_text(encoding="utf-8"))
        for account_id, plan in (saved.get("plans") or {}).items():
            if account_id not in accounts:
                continue
            payment_type = "credit" if plan.get("paymentType") == "credit" else "prepaid"
            if payment_type == "credit" and (float(plan.get("dailyLimit") or 0) <= 0 or float(plan.get("weeklyLimit") or 0) <= 0):
                continue
            deposit_at = None
            if payment_type == "prepaid" and plan.get("depositDate"):
                deposit_at = f"{plan['depositDate']}T{plan.get('depositTime') or '00:00'}:00-03:00"
            plan_rows.append({
                "account_id": account_id,
                "payment_type": payment_type,
                "deposit_amount": plan.get("deposit") or 0,
                "deposit_at": deposit_at,
                "planned_days": max(1, int(plan.get("plannedDays") or 1)),
                "daily_limit": plan.get("dailyLimit") or 0,
                "weekly_limit": plan.get("weeklyLimit") or 0,
                "week_start_day": 0 if int(plan.get("weekStartDay", 1)) == 0 else 1,
            })
    request("monitoring_plans", plan_rows, "account_id")
    if since != until:
        return {"ok": True, "audit_run_id": run_id, "accounts": len(account_rows), "plans": len(plan_rows), "daily_rows": 0, "campaign_rows": 0}
    provisional = until >= datetime.now(ZoneInfo("America/Sao_Paulo")).date().isoformat()
    daily_rows = []
    campaign_rows = []
    for account_id, row in accounts.items():
        if not row.get("reconciled"):
            continue
        campaigns = row.get("campaigns") or []
        total_results = None
        if row.get("result_reconciled") is True and all(item.get("results") is not None for item in campaigns):
            total_results = sum(float(item.get("results") or 0) for item in campaigns)
        daily_rows.append({
            "account_id": account_id,
            "metric_date": since,
            "audit_run_id": run_id,
            "spend": row.get("spend") or 0,
            "campaign_sum": row.get("campaign_sum") or 0,
            "results": total_results,
            "active_campaign_count": row.get("active_campaign_count") or 0,
            "spend_reconciled": True,
            "result_reconciled": row.get("result_reconciled") is True,
            "is_provisional": provisional,
            "raw_payload": row,
        })
        for campaign in campaigns:
            if not campaign.get("campaign_id"):
                continue
            campaign_rows.append({
                "account_id": account_id,
                "campaign_id": str(campaign.get("campaign_id")),
                "metric_date": since,
                "audit_run_id": run_id,
                "campaign_name": campaign.get("campaign_name") or str(campaign.get("campaign_id")),
                "objective": campaign.get("objective"),
                "objective_label": campaign.get("objective_label"),
                "effective_status": campaign.get("effective_status") or campaign.get("status"),
                "result_type": campaign.get("result_type"),
                "spend": campaign.get("spend") or 0,
                "results": metric_number(campaign.get("results")),
                "cost_per_result": metric_number(campaign.get("cost_per_result")),
                "spend_reconciled": True,
                "result_reconciled": row.get("result_reconciled") is True and campaign.get("results") is not None,
                "is_provisional": provisional,
                "raw_payload": campaign,
            })
    request("account_daily_metrics", daily_rows, "account_id,metric_date")
    request("campaign_daily_metrics", campaign_rows, "account_id,campaign_id,metric_date")
    return {"ok": True, "audit_run_id": run_id, "accounts": len(account_rows), "plans": len(plan_rows), "daily_rows": len(daily_rows), "campaign_rows": len(campaign_rows)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Persiste snapshots reconciliados do Monitor Meta Ads no Supabase.")
    parser.add_argument("payload", type=Path)
    parser.add_argument("--window", choices=("today", "yesterday", "90d", "custom", "cycle_reset"), required=True)
    parser.add_argument("--env-file", type=Path, default=Path("/opt/meta-ads-cli/secrets/supabase.env"))
    parser.add_argument("--plans-file", type=Path, default=Path("/opt/meta-ads-cli/data/alerts/plans.json"))
    args = parser.parse_args()
    load_env(args.env_file)
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SECRET_KEY"):
        raise RuntimeError("Credenciais do Supabase não configuradas.")
    result = sync(args.payload, args.window, args.plans_file)
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
