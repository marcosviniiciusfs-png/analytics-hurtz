from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import requests

from env_utils import load_env


DEFAULT_ENV = Path("/opt/meta-ads-cli/secrets/.env")
ACCOUNT_FIELDS = "id,name,account_status,currency,amount_spent,balance,spend_cap,business,is_prepay_account"


class MetaApiError(RuntimeError):
    pass


def graph_get(version: str, path: str, token: str, params: dict[str, Any]) -> dict:
    safe_params = dict(params)
    safe_params["access_token"] = token
    try:
        response = requests.get(
            f"https://graph.facebook.com/{version}/{path.lstrip('/')}",
            params=safe_params,
            timeout=45,
        )
    except requests.RequestException as exc:
        raise MetaApiError(f"Falha de rede: {type(exc).__name__}") from None

    try:
        payload = response.json()
    except ValueError:
        raise MetaApiError(f"Resposta invalida (HTTP {response.status_code})") from None

    if response.status_code >= 400 or "error" in payload:
        error = payload.get("error", {})
        raise MetaApiError(
            f"HTTP {response.status_code}; codigo={error.get('code', 'n/a')}; "
            f"subcodigo={error.get('error_subcode', 'n/a')}; mensagem={error.get('message', 'sem descricao')}"
        )
    return payload


def paginate(version: str, path: str, token: str, params: dict[str, Any], max_pages: int = 20) -> list[dict]:
    rows: list[dict] = []
    after: str | None = None
    for _ in range(max_pages):
        current = dict(params)
        if after:
            current["after"] = after
        payload = graph_get(version, path, token, current)
        rows.extend(payload.get("data", []))
        after = payload.get("paging", {}).get("cursors", {}).get("after")
        if not after or not payload.get("paging", {}).get("next"):
            break
    return rows


def field_coverage(accounts: list[dict], field: str) -> int:
    return sum(1 for account in accounts if field in account and account[field] not in (None, ""))


def money_from_minor_units(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return int(str(value)) / 100
    except (TypeError, ValueError):
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Diagnostico somente leitura do acesso Meta Ads.")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV)
    parser.add_argument("--sample-accounts", type=int, default=3)
    parser.add_argument("--output", type=Path, default=Path("/opt/meta-ads-cli/diagnostic-result.json"))
    args = parser.parse_args()

    try:
        env = load_env(args.env_file)
        token = env["META_ACCESS_TOKEN"]
        version = env.get("META_API_VERSION", "v25.0")

        accounts = paginate(
            version,
            "me/adaccounts",
            token,
            {"fields": ACCOUNT_FIELDS, "limit": 100},
        )
        businesses = Counter(
            (account.get("business") or {}).get("name", "Sem business informado")
            for account in accounts
        )
        business_rows = paginate(
            version,
            "me/businesses",
            token,
            {"fields": "id,name,profile_picture_uri", "limit": 100},
        )
        business_pictures = {
            row.get("id"): row.get("profile_picture_uri")
            for row in business_rows
            if row.get("id") and row.get("profile_picture_uri")
        }

        samples: list[dict] = []
        for account in accounts[: max(0, args.sample_accounts)]:
            account_id = account["id"]
            campaigns = paginate(
                version,
                f"{account_id}/campaigns",
                token,
                {"fields": "id,name,status,effective_status,objective", "limit": 100},
                max_pages=5,
            )
            insights = paginate(
                version,
                f"{account_id}/insights",
                token,
                {
                    "level": "campaign",
                    "date_preset": "last_7d",
                    "fields": "campaign_id,campaign_name,objective,spend,actions,cost_per_action_type",
                    "limit": 100,
                },
                max_pages=5,
            )
            action_types = sorted(
                {
                    action.get("action_type")
                    for row in insights
                    for action in row.get("actions", [])
                    if action.get("action_type")
                }
            )
            samples.append(
                {
                    "account_id": account_id,
                    "account_name": account.get("name"),
                    "campaign_count": len(campaigns),
                    "active_campaign_count": sum(
                        1 for campaign in campaigns if campaign.get("effective_status") == "ACTIVE"
                    ),
                    "insight_rows_last_7d": len(insights),
                    "action_types_last_7d": action_types,
                }
            )

        report = {
            "read_only": True,
            "api_version": version,
            "account_count": len(accounts),
            "business_count": len(businesses),
            "businesses": dict(sorted(businesses.items())),
            "field_coverage": {
                field: field_coverage(accounts, field)
                for field in ("account_status", "currency", "amount_spent", "balance", "spend_cap", "business", "is_prepay_account")
            },
            "accounts": [
                {
                    "id": account.get("id"),
                    "name": account.get("name"),
                    "account_status": account.get("account_status"),
                    "currency": account.get("currency"),
                    "business_name": (account.get("business") or {}).get("name"),
                    "business_id": (account.get("business") or {}).get("id"),
                    "business_profile_picture_uri": business_pictures.get((account.get("business") or {}).get("id")),
                    "is_prepay_account": account.get("is_prepay_account"),
                    "graph_adaccount_balance_raw": account.get("balance"),
                    "graph_adaccount_balance": money_from_minor_units(account.get("balance")),
                    "graph_adaccount_balance_warning": (
                        "Nao corresponde necessariamente ao saldo atual exibido no Billing Hub; "
                        "nao usar como saldo pre-pago disponivel sem reconciliacao."
                    ),
                    "amount_spent_lifetime": money_from_minor_units(account.get("amount_spent")),
                    "spend_cap": money_from_minor_units(account.get("spend_cap")),
                    "has_balance": "balance" in account,
                    "has_spend_cap": "spend_cap" in account,
                    "has_amount_spent": "amount_spent" in account,
                }
                for account in accounts
            ],
            "samples": samples,
        }

        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        args.output.chmod(0o600)

        print(f"Diagnostico concluido: {len(accounts)} contas em {len(businesses)} businesses.")
        print("Cobertura de campos: " + ", ".join(f"{k}={v}/{len(accounts)}" for k, v in report["field_coverage"].items()))
        print(f"Amostras consultadas: {len(samples)}. Resultado salvo com permissao 600.")
        return 0
    except (RuntimeError, MetaApiError) as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
