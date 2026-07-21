from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from statistics import median
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parent
TZ = ZoneInfo("America/Sao_Paulo")
DATA_DIR = Path(os.getenv("META_ALERT_DATA_DIR", "/opt/meta-ads-cli/data/alerts"))
AUDIT_DIR = Path(os.getenv("META_AUDIT_DATA_DIR", "/opt/meta-ads-cli/data/audits"))
PLANS_PATH = Path(os.getenv("META_ALERT_PLANS", DATA_DIR / "plans.json"))
CONFIG_PATH = Path(os.getenv("META_ALERT_CONFIG", DATA_DIR / "config.json"))
STATE_PATH = DATA_DIR / "state.json"
HISTORY_PATH = DATA_DIR / "history.jsonl"

DEFAULT_CONFIG = {
    "enabled": False,
    "dry_run": True,
    "thresholds": [75, 90, 100, 120],
    "balance_thresholds": [50, 75, 90, 100],
    "quiet_start": "21:00",
    "quiet_end": "07:00",
    "daily_summary_time": "19:30",
    "velocity_enabled": True,
    "velocity_window_minutes": 60,
    "velocity_percent": 100,
    "recommendations_enabled": True,
}


def read_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    os.chmod(temporary, 0o600)
    temporary.replace(path)


def money(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def append_history(event: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with HISTORY_PATH.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(event, ensure_ascii=False) + "\n")
    os.chmod(HISTORY_PATH, 0o600)


def evolution_send(text: str, config: dict) -> tuple[bool, str]:
    if config.get("dry_run", True):
        return True, "dry-run"
    base = os.getenv("EVOLUTION_API_URL", "").rstrip("/")
    key = os.getenv("EVOLUTION_API_KEY", "")
    instance = config.get("evolution_instance") or os.getenv("EVOLUTION_INSTANCE", "")
    group = config.get("evolution_group_jid") or os.getenv("EVOLUTION_GROUP_JID", "")
    if not all((base, key, instance, group)):
        return False, "Evolution API não configurada"
    payload = json.dumps({"number": group, "text": text, "delay": 1200, "linkPreview": False}).encode()
    request = urllib.request.Request(
        f"{base}/message/sendText/{instance}", data=payload, method="POST",
        headers={"Content-Type": "application/json", "apikey": key},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return 200 <= response.status < 300, f"HTTP {response.status}"
    except Exception as error:  # recorded without secrets
        return False, str(error)[:240]


def quiet_now(config: dict, now: datetime | None = None) -> bool:
    now = now or datetime.now(TZ)
    try:
        start_h, start_m = map(int, config.get("quiet_start", "21:00").split(":"))
        end_h, end_m = map(int, config.get("quiet_end", "07:00").split(":"))
        current = now.hour * 60 + now.minute
        start, end = start_h * 60 + start_m, end_h * 60 + end_m
        return start <= current < end if start < end else current >= start or current < end
    except (TypeError, ValueError):
        return False


def emit(kind: str, severity: str, account: dict | None, text: str, key: str, state: dict, config: dict, force=False) -> bool:
    now = datetime.now(TZ)
    sent = state.setdefault("sent", {})
    if not force and key in sent:
        return False
    if not force and severity != "critical" and quiet_now(config, now):
        pending = state.setdefault("pending", {})
        pending[key] = {"kind": kind, "severity": severity, "account": account, "text": text, "key": key}
        return False
    ok, delivery = evolution_send(text, config)
    event = {
        "created_at": now.isoformat(), "key": key, "kind": kind, "severity": severity,
        "account_id": account.get("id") if account else None,
        "account_name": account.get("name") if account else None,
        "message": text, "delivered": ok, "delivery": delivery,
    }
    append_history(event)
    if ok:
        sent[key] = now.isoformat()
    return ok


def flush_pending(state: dict, config: dict) -> int:
    if quiet_now(config):
        return 0
    pending = state.get("pending", {})
    delivered = 0
    for key, item in list(pending.items()):
        if emit(item["kind"], item["severity"], item.get("account"), item["text"], key, state, config):
            pending.pop(key, None)
            delivered += 1
    return delivered


def latest_payload(window: str) -> dict:
    return read_json(AUDIT_DIR / f"{window}-latest.json", {})


def account_plans() -> dict:
    payload = read_json(PLANS_PATH, {"plans": {}})
    return payload.get("plans", payload if isinstance(payload, dict) else {})


def financial_alerts(today_payload: dict, plans: dict, state: dict, config: dict) -> int:
    emitted = 0
    now = datetime.now(TZ)
    date_key = now.date().isoformat()
    samples = state.setdefault("spend_samples", {})
    for account_id, row in today_payload.get("accounts", {}).items():
        plan = plans.get(account_id, {})
        limit = float(plan.get("dailyLimit") or 0)
        spend = float(row.get("spend") or 0)
        if not limit or not row.get("reconciled"):
            continue
        ratio = spend / limit * 100
        for threshold in sorted(config.get("thresholds", [])):
            if ratio < float(threshold):
                continue
            severity = "critical" if threshold >= 100 else "warning"
            icon = "🔴" if severity == "critical" else "🟡"
            text = (f"{icon} *Alerta de gasto — {row.get('name') or account_id}*\n"
                    f"A conta atingiu {ratio:.0f}% do limite diário.\n"
                    f"Gasto provisório: {money(spend)} de {money(limit)}.\n"
                    f"Atualizado às {now:%H:%M} (America/Sao_Paulo).")
            emitted += emit("daily_limit", severity, row, text, f"{date_key}:{account_id}:limit:{threshold}", state, config)
        account_samples = [item for item in samples.get(account_id, []) if item.get("date") == date_key]
        window_minutes = int(config.get("velocity_window_minutes") or 60)
        previous = next((item for item in reversed(account_samples) if (now - datetime.fromisoformat(item["at"])).total_seconds() / 60 >= min(15, window_minutes)), None)
        observed_minutes = (now - datetime.fromisoformat(previous["at"])).total_seconds() / 60 if previous else 0
        projected = max(0, spend - float(previous.get("spend") or 0)) / observed_minutes * window_minutes if observed_minutes else 0
        velocity_target = limit * float(config.get("velocity_percent") or 100) / 100
        if config.get("velocity_enabled") and previous and projected >= velocity_target:
            text = (f"🟡 *Ritmo de gasto elevado — {row.get('name') or account_id}*\n"
                    f"No ritmo dos últimos {observed_minutes:.0f} minutos, a conta pode consumir {money(projected)} em {window_minutes} minutos.\n"
                    f"O gatilho configurado é {float(config.get('velocity_percent') or 100):.0f}% do limite de {money(limit)} nessa janela.\n"
                    "Dado provisório do dia; confirme antes de alterar campanhas.")
            emitted += emit("spend_velocity", "warning", row, text, f"{date_key}:{account_id}:velocity", state, config)
        account_samples.append({"at": now.isoformat(), "date": date_key, "spend": spend})
        samples[account_id] = account_samples[-16:]
    return emitted


def recommendations(payload: dict, state: dict, config: dict) -> int:
    if not config.get("recommendations_enabled", True):
        return 0
    emitted = 0
    period = f"{payload.get('since')}:{payload.get('until')}"
    for account_id, row in payload.get("accounts", {}).items():
        if not row.get("reconciled") or not row.get("result_reconciled"):
            continue
        groups = {}
        for campaign in row.get("campaigns", []):
            results = campaign.get("results")
            cost = campaign.get("cost_per_result")
            if results is None or cost is None:
                continue
            groups.setdefault((campaign.get("objective"), campaign.get("result_type")), []).append(campaign)
        for campaigns in groups.values():
            costs = [float(item["cost_per_result"]) for item in campaigns if float(item.get("results") or 0) >= 3]
            if not costs:
                continue
            benchmark = median(costs)
            for campaign in campaigns:
                results = float(campaign.get("results") or 0)
                cost = float(campaign.get("cost_per_result") or 0)
                if results < 5 or not benchmark or cost > benchmark * .8:
                    continue
                text = (f"🔵 *Oportunidade auditada — {row.get('name') or account_id}*\n"
                        f"Campanha: {campaign.get('campaign_name')}\n"
                        f"Resultados: {results:.0f} | Custo/resultado: {money(cost)}.\n"
                        f"Desempenho {(1-cost/benchmark)*100:.0f}% melhor que a mediana comparável.\n"
                        "Recomendação: avaliar um novo teste; nenhuma campanha foi alterada automaticamente.")
                key = f"{period}:{account_id}:opportunity:{campaign.get('campaign_id')}"
                emitted += emit("opportunity", "recommendation", row, text, key, state, config)
    return emitted


def prune_state(state: dict) -> None:
    cutoff = datetime.now(TZ) - timedelta(days=100)
    state["sent"] = {key: value for key, value in state.get("sent", {}).items()
                     if datetime.fromisoformat(value) >= cutoff}


def main() -> int:
    parser = argparse.ArgumentParser(description="Motor de alertas do Monitor Meta Ads Hurtz")
    parser.add_argument("--mode", choices=("financial", "recommendations", "all", "test"), default="all")
    parser.add_argument("--message", default="✅ Teste do Monitor Meta Ads Hurtz. A integração de alertas está funcionando.")
    parser.add_argument("--message-base64")
    parser.add_argument("--force-send", action="store_true")
    args = parser.parse_args()
    config = {**DEFAULT_CONFIG, **read_json(CONFIG_PATH, {})}
    state = read_json(STATE_PATH, {"sent": {}})
    if args.mode == "test":
        if args.force_send:
            config["dry_run"] = False
        message = base64.b64decode(args.message_base64).decode("utf-8") if args.message_base64 else args.message
        ok = emit("test", "info", None, message[:2000], f"test:{datetime.now(TZ).timestamp()}", state, config, force=True)
        write_json(STATE_PATH, state)
        print(json.dumps({"ok": ok, "dry_run": config.get("dry_run", True)}, ensure_ascii=False))
        return 0 if ok else 1
    if not config.get("enabled", False):
        print(json.dumps({"ok": True, "enabled": False, "message": "Alertas desativados"}, ensure_ascii=False))
        return 0
    count = 0
    count += flush_pending(state, config)
    if args.mode in ("financial", "all"):
        count += financial_alerts(latest_payload("today"), account_plans(), state, config)
    if args.mode in ("recommendations", "all"):
        count += recommendations(latest_payload("90d"), state, config)
    prune_state(state)
    state["last_run"] = datetime.now(TZ).isoformat()
    write_json(STATE_PATH, state)
    print(json.dumps({"ok": True, "emitted": count, "dry_run": config.get("dry_run", True)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
