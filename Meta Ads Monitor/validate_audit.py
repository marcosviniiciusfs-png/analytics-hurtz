from __future__ import annotations

import argparse
import json
from decimal import Decimal
from pathlib import Path


def validate(payload: dict, allow_pending_results: bool = False) -> dict:
    errors: list[str] = []
    warnings: list[str] = []
    accounts = payload.get("accounts") or {}
    if not accounts:
        errors.append("Nenhuma conta retornada.")
    for account_id, row in accounts.items():
        if not row.get("reconciled"):
            message = f"{account_id}: gasto ao vivo ainda não reconciliado; não tratar como auditado."
            (warnings if allow_pending_results else errors).append(message)
            continue
        spend = Decimal(str(row.get("spend", 0)))
        campaign_sum = Decimal(str(row.get("campaign_sum", 0)))
        calculated = sum((Decimal(str(item.get("spend", 0))) for item in row.get("campaigns", [])), Decimal("0"))
        if spend != campaign_sum or spend != calculated:
            errors.append(f"{account_id}: conta={spend}, campaign_sum={campaign_sum}, soma calculada={calculated}.")
        if row.get("result_reconciled") is not True:
            message = f"{account_id}: actions da conta ainda não reconciliaram com as campanhas."
            (warnings if allow_pending_results else errors).append(message)
        for campaign in row.get("campaigns", []):
            results = campaign.get("results")
            cost = campaign.get("cost_per_result")
            if results is None:
                warnings.append(f"{account_id}/{campaign.get('campaign_id')}: resultado não auditável.")
            elif Decimal(str(results)) == 0 and cost is not None:
                errors.append(f"{account_id}/{campaign.get('campaign_id')}: custo por resultado existe com zero resultados.")
            elif Decimal(str(results)) > 0:
                expected = Decimal(str(campaign.get("spend", 0))) / Decimal(str(results))
                if cost is None or abs(Decimal(str(cost)) - expected) > Decimal("0.000001"):
                    errors.append(f"{account_id}/{campaign.get('campaign_id')}: custo por resultado divergente.")
    return {
        "ok": not errors,
        "account_count": len(accounts),
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida uma coleta auditada do Monitor Meta Ads.")
    parser.add_argument("payload", type=Path)
    parser.add_argument("--status-output", type=Path)
    parser.add_argument("--allow-pending-results", action="store_true")
    args = parser.parse_args()
    result = validate(json.loads(args.payload.read_text(encoding="utf-8")), args.allow_pending_results)
    if args.status_output:
        args.status_output.parent.mkdir(parents=True, exist_ok=True)
        args.status_output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
