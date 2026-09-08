import concurrent.futures
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from decimal import Decimal
from account_credentials import account_token
from result_metrics import result_metrics, serializable_metrics

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
    mapped = result_metrics(actions)
    return mapped['label'], mapped['type'], mapped['results']


def get(path, params):
    query = urllib.parse.urlencode({**params, "access_token": account_token(path, TOKEN)})
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
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        campaign_details_future = pool.submit(get, f"{account_id}/campaigns", {"fields": "id,name,objective,status,effective_status", "limit": 500})
        campaign_daily_future = pool.submit(get, f"{account_id}/insights", {"level": "campaign", "fields": "campaign_id,campaign_name,objective,spend,actions,cost_per_action_type", "time_range": period, "time_increment": 1, "limit": 500})
        account_daily_future = pool.submit(get, f"{account_id}/insights", {"level": "account", "fields": "account_id,account_name,spend,actions", "time_range": period, "time_increment": 1, "limit": 500})
        metadata_available = True
        try:
            campaign_details = campaign_details_future.result()
        except Exception:
            # Optional current status must not discard historical Insights.
            campaign_details = []
            metadata_available = False
        campaign_daily = campaign_daily_future.result()
        account_daily = account_daily_future.result()
    campaign_meta = {row["id"]: row for row in campaign_details}
    active_campaign_count = sum(1 for row in campaign_details if row.get("effective_status") == "ACTIVE") if metadata_available else None
    for attempt_index in range(3):
        if attempt_index:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                campaign_daily_future = pool.submit(get, f"{account_id}/insights", {"level": "campaign", "fields": "campaign_id,campaign_name,objective,spend,actions,cost_per_action_type", "time_range": period, "time_increment": 1, "limit": 500})
                account_daily_future = pool.submit(get, f"{account_id}/insights", {"level": "account", "fields": "account_id,account_name,spend,actions", "time_range": period, "time_increment": 1, "limit": 500})
                campaign_daily = campaign_daily_future.result()
                account_daily = account_daily_future.result()
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
            current = campaign_totals.setdefault(row["campaign_id"], {"campaign_id": row["campaign_id"], "campaign_name": row["campaign_name"], "objective": row.get("objective") or meta.get("objective"), "status": meta.get("status"), "effective_status": meta.get("effective_status"), "first_delivery_date": row.get("date_start"), "last_delivery_date": row.get("date_start"), "spend": Decimal("0"), "actions": {}})
            current["spend"] += spend
            current["first_delivery_date"] = min(current["first_delivery_date"], row.get("date_start"))
            current["last_delivery_date"] = max(current["last_delivery_date"], row.get("date_start"))
            for action in row.get("actions", []):
                action_type = action.get("action_type")
                if action_type:
                    current["actions"][action_type] = current["actions"].get(action_type, Decimal("0")) + Decimal(action.get("value", "0"))
        # The insights edge omits campaigns without delivery in the selected
        # period. Retain accessible active campaigns, explicitly marked as such.
        for meta in campaign_details:
            if meta.get('effective_status') == 'ACTIVE' and meta['id'] not in campaign_totals:
                campaign_totals[meta['id']] = {
                    'campaign_id': meta['id'], 'campaign_name': meta.get('name', meta['id']),
                    'objective': meta.get('objective'), 'status': meta.get('status'),
                    'effective_status': meta.get('effective_status'), 'spend': Decimal('0'),
                    'actions': {}, 'no_delivery_in_period': True,
                    'first_delivery_date': None, 'last_delivery_date': None,
                }
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
                    **serializable_metrics(row["actions"]),
                    "cost_per_result": float(cost_per_result) if cost_per_result is not None else None,
                })
            result_reconciled = all(account_actions.get(key, Decimal("0")) == campaign_actions.get(key, Decimal("0")) for key in set(account_actions) | set(campaign_actions) if "lead" in key or "messaging_conversation_started" in key)
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
