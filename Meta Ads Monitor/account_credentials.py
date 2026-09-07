"""Server-only credentials for additional, explicitly configured ad accounts."""
from functools import lru_cache
import json
import os
from pathlib import Path


@lru_cache(maxsize=1)
def connections():
    path = Path(os.environ.get("META_CONNECTIONS_FILE", "/opt/meta-ads-cli/secrets/connections.json"))
    if not path.exists():
        return []
    try:
        rows = json.loads(path.read_text(encoding="utf-8"))["connections"]
        seen = set()
        for row in rows:
            if not row.get("access_token") or not isinstance(row.get("account_ids"), list):
                raise ValueError()
            for account_id in row["account_ids"]:
                if not account_id.startswith("act_") or not account_id[4:].isdigit() or account_id in seen:
                    raise ValueError()
                seen.add(account_id)
        return rows
    except (ValueError, KeyError, TypeError, AttributeError):
        raise RuntimeError("Configuracao de conexoes Meta invalida") from None


def account_token(path, fallback):
    personal = os.environ.get("META_USER_ACCESS_TOKEN")
    if personal:
        return personal
    account_id = path.strip("/").split("/", 1)[0]
    for row in connections():
        if account_id in row["account_ids"]:
            return row["access_token"]
    return fallback
