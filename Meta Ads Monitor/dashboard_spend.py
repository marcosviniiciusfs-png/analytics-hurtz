import concurrent.futures
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from decimal import Decimal

VERSION = os.environ.get("META_API_VERSION", "v25.0")
TOKEN = os.environ["META_ACCESS_TOKEN"]
ACCOUNTS = [
    "act_478905369997301",
    "act_767057339654401",
    "act_1467904571001656",
    "act_36589456883979012",
    "act_2797573667298980",
    "act_1505271587761873",
]
MESSAGE_RESULT_TYPES = [
    "onsite_conversion.messaging_conversation_started_7d",
]
FORM_RESULT_TYPES = [
    "onsite_conversion.lead_grouped",
    "lead",
    "offsite_complete_registration_add_meta_leads",
]


def choose_result(actions, objective, campaign_name):
    """Map results from returned action types; use names only as an uncounted label."""
    normalized_name = (campaign_name or "").upper()
    families = {
        "Formulário": [item for item in FORM_RESULT_TYPES if actions.get(item, Decimal("0")) > 0],
        "Mensagem": [item for item in MESSAGE_RESULT_TYPES if actions.get(item, Decimal("0")) > 0],
    }
    observed = [label for label, items in families.items() if items]
    if len(observed) == 1:
        label = observed[0]
        action_type = families[label][0]
        return label, action_type, actions[action_type]
    preferred = ("Mensagem", MESSAGE_RESULT_TYPES) if objective == "OUTCOME_ENGAGEMENT" else (("Formulário", FORM_RESULT_TYPES) if objective == "OUTCOME_LEADS" else (None, []))
    if len(observed) > 1:
        for action_type in preferred[1]:
            if actions.get(action_type, Decimal("0")) > 0:
                return preferred[0], action_type, actions[action_type]
        return "Resultado ambíguo", None, None
    if preferred[0]:
        return preferred[0], preferred[1][0], Decimal("0")
    if "MENSAGEM" in normalized_name or "WHATSAPP" in normalized_name:
        return "Mensagem", None, None
    if "FORMUL" in normalized_name or "LEAD" in normalized_name:
        return "Formulário", None, None
    return "Não informado", None, None


def get(path, params):
    query = urllib.parse.urlencode({**params, "access_token": TOKEN})
    url = f"https://graph.facebook.com/{VERSION}/{path}?{query}"
    rows = []
    while url:
        with urllib.request.urlopen(url, timeout=40) as response:
            payload = json.load(response)
        rows.extend(payload.get("data", []))
        url = payload.get("paging", {}).get("next")
    return rows


def audit(account_id, period):
    attempts = []
    campaign_details = get(f"{account_id}/campaigns", {"fields": "id,name,objective,status,effective_status", "limit": 500})
    campaign_meta = {row["id"]: row for row in campaign_details}
    active_campaign_count = sum(1 for row in campaign_details if row.get("effective_status") == "ACTIVE")
    for attempt_index in range(3):
        campaign_daily = get(f"{account_id}/insights", {"level": "campaign", "fields": "campaign_id,campaign_name,spend,actions,cost_per_action_type", "time_range": period, "time_increment": 1, "limit": 500})
        account_daily = get(f"{account_id}/insights", {"level": "account", "fields": "account_id,account_name,spend,actions", "time_range": period, "time_increment": 1, "limit": 500})
        account_by_date = {row["date_start"]: Decimal(row.get("spend", "0")) for row in account_daily}
        account_actions = {}
        for account_row in account_daily:
            for action in account_row.get("actions", []):
                action_type = action.get("action_type")
                if action_type:
                    account_actions[action_type] = account_actions.get(action_type, Decimal("0")) + Decimal(action.get("value", "0"))
        campaign_by_date = {}
        campaign_totals = {}
        for row in campaign_daily:
            spend = Decimal(row.get("spend", "0"))
            campaign_by_date[row["date_start"]] = campaign_by_date.get(row["date_start"], Decimal("0")) + spend
            meta = campaign_meta.get(row["campaign_id"], {})
            current = campaign_totals.setdefault(row["campaign_id"], {"campaign_id": row["campaign_id"], "campaign_name": row["campaign_name"], "objective": meta.get("objective"), "status": meta.get("status"), "effective_status": meta.get("effective_status"), "first_delivery_date": row.get("date_start"), "last_delivery_date": row.get("date_start"), "spend": Decimal("0"), "actions": {}})
            current["spend"] += spend
            current["first_delivery_date"] = min(current["first_delivery_date"], row.get("date_start"))
            current["last_delivery_date"] = max(current["last_delivery_date"], row.get("date_start"))
            for action in row.get("actions", []):
                action_type = action.get("action_type")
                if action_type:
                    current["actions"][action_type] = current["actions"].get(action_type, Decimal("0")) + Decimal(action.get("value", "0"))
        account_spend = sum(account_by_date.values(), Decimal("0"))
        campaign_sum = sum(campaign_by_date.values(), Decimal("0"))
        campaign_actions = {}
        for campaign in campaign_totals.values():
            for action_type, value in campaign["actions"].items():
                campaign_actions[action_type] = campaign_actions.get(action_type, Decimal("0")) + value
        action_types = set(account_actions) | set(campaign_actions)
        account_action_totals_match = all(account_actions.get(action_type, Decimal("0")) == campaign_actions.get(action_type, Decimal("0")) for action_type in action_types)
        all_dates = sorted(set(account_by_date) | set(campaign_by_date))
        daily = [{"date": date, "account_spend": float(account_by_date.get(date, Decimal("0"))), "campaign_sum": float(campaign_by_date.get(date, Decimal("0"))), "reconciled": account_by_date.get(date, Decimal("0")) == campaign_by_date.get(date, Decimal("0"))} for date in all_dates]
        spend_reconciled = account_spend == campaign_sum and all(row["reconciled"] for row in daily)
        attempts.append({"account_spend": str(account_spend), "campaign_sum": str(campaign_sum), "account_action_totals_match": account_action_totals_match})
        if spend_reconciled:
            campaigns = []
            for row in campaign_totals.values():
                objective_label, result_type, results = choose_result(row["actions"], row.get("objective"), row.get("campaign_name"))
                cost_per_result = row["spend"] / results if results and results > 0 else None
                campaigns.append({
                    **{key: value for key, value in row.items() if key != "actions"},
                    "spend": float(row["spend"]),
                    "objective_label": objective_label,
                    "result_type": result_type,
                    "results": float(results) if results is not None else None,
                    "cost_per_result": float(cost_per_result) if cost_per_result is not None else None,
                })
            result_reconciled = all(campaign["objective_label"] != "Resultado ambíguo" for campaign in campaigns)
            return {"id": account_id, "name": account_daily[0].get("account_name") if account_daily else None, "spend": float(account_spend), "campaign_sum": float(campaign_sum), "reconciled": True, "result_reconciled": result_reconciled, "account_action_totals_match": account_action_totals_match, "daily": daily, "campaigns": campaigns, "active_campaign_count": active_campaign_count, "attempts": attempts}
        time.sleep(1)
    return {
        "id": account_id,
        "name": account_daily[0].get("account_name") if account_daily else None,
        "spend": float(account_spend),
        "campaign_sum": float(campaign_sum),
        "reconciled": False,
        "result_reconciled": False,
        "provisional": True,
        "daily": daily,
        "campaigns": [],
        "active_campaign_count": active_campaign_count,
        "attempts": attempts,
    }


def main():
    since, until = sys.argv[1:3]
    account_ids = sys.argv[3:] or ACCOUNTS
    period = json.dumps({"since": since, "until": until}, separators=(",", ":"))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        rows = list(pool.map(lambda account_id: audit(account_id, period), account_ids))
    print(json.dumps({"since": since, "until": until, "accounts": {row["id"]: row for row in rows}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
