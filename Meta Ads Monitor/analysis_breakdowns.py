from __future__ import annotations

import concurrent.futures
import json
import os
import sys
import urllib.parse
import urllib.request
from decimal import Decimal


VERSION = os.environ.get("META_API_VERSION", "v25.0")
TOKEN = os.environ["META_ACCESS_TOKEN"]
MESSAGE_TYPES = ("onsite_conversion.messaging_conversation_started_7d",)
FORM_TYPES = ("onsite_conversion.lead_grouped", "offsite_complete_registration_add_meta_leads", "lead")


def get(path: str, params: dict) -> list[dict]:
    query = urllib.parse.urlencode({**params, "access_token": TOKEN})
    url = f"https://graph.facebook.com/{VERSION}/{path}?{query}"
    rows: list[dict] = []
    while url:
        with urllib.request.urlopen(url, timeout=50) as response:
            payload = json.load(response)
        rows.extend(payload.get("data", []))
        url = payload.get("paging", {}).get("next")
    return rows


def action_map(row: dict) -> dict[str, Decimal]:
    return {item["action_type"]: Decimal(item.get("value", "0")) for item in row.get("actions", []) if item.get("action_type")}


def result_count(row: dict) -> Decimal:
    actions = action_map(row)
    message = sum((actions.get(kind, Decimal("0")) for kind in MESSAGE_TYPES), Decimal("0"))
    form = next((actions[kind] for kind in FORM_TYPES if kind in actions), Decimal("0"))
    return message + form


def result_type(row: dict) -> str:
    actions = action_map(row)
    message = sum((actions.get(kind, Decimal("0")) for kind in MESSAGE_TYPES), Decimal("0"))
    form = next((actions[kind] for kind in FORM_TYPES if kind in actions), Decimal("0"))
    if message > 0 and form > 0:
        return "Misto"
    if message > 0:
        return "Conversas iniciadas"
    if form > 0:
        return "Formulário instantâneo"
    return "Sem resultado atribuído"


def money(row: dict, field: str = "spend") -> Decimal:
    return Decimal(row.get(field, "0") or "0")


def metrics(row: dict) -> dict:
    spend = money(row)
    results = result_count(row)
    impressions = int(row.get("impressions", 0) or 0)
    reach = int(row.get("reach", 0) or 0)
    clicks = int(row.get("clicks", 0) or 0)
    return {
        "spend": float(spend),
        "results": float(results),
        "impressions": impressions,
        "reach": reach,
        "clicks": clicks,
        "ctr": float(row.get("ctr", 0) or 0),
        "cpm": float(row.get("cpm", 0) or 0),
        "cpc": float(row.get("cpc", 0) or 0),
        "cost_per_result": float(spend / results) if results > 0 else None,
    }


def creative_format(creative: dict) -> str:
    story = creative.get("object_story_spec") or {}
    if creative.get("video_id") or story.get("video_data"):
        return "Vídeo"
    if creative.get("image_hash") or (story.get("link_data") or {}).get("image_hash") or (story.get("photo_data") or {}).get("image_hash"):
        return "Imagem"
    object_type = (creative.get("object_type") or "").upper()
    if "VIDEO" in object_type:
        return "Vídeo"
    if object_type in {"PHOTO", "SHARE", "STATUS"}:
        return "Imagem"
    if creative.get("asset_feed_spec"):
        return "Dinâmico"
    return "Não identificado"


def money_equal(left: Decimal, right: Decimal) -> bool:
    return abs(left - right) < Decimal("0.01")


def breakdown(account_id: str, period: str, report_only: bool = False) -> dict:
    base_fields = "spend,impressions,reach,clicks,ctr,cpm,cpc,actions"
    if report_only:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            account_future = pool.submit(get, f"{account_id}/insights", {"level": "account", "fields": base_fields, "time_range": period, "limit": 100})
            ads_future = pool.submit(get, f"{account_id}/insights", {"level": "ad", "fields": f"ad_id,ad_name,campaign_id,campaign_name,{base_fields}", "time_range": period, "limit": 500})
            account_rows = account_future.result()
            ad_rows = ads_future.result()
    else:
        account_rows = get(f"{account_id}/insights", {"level": "account", "fields": base_fields, "time_range": period, "limit": 100})
        ad_rows = get(f"{account_id}/insights", {"level": "ad", "fields": f"ad_id,ad_name,campaign_id,campaign_name,{base_fields}", "time_range": period, "limit": 500})
    account_row = account_rows[0] if account_rows else {}
    account_metrics = metrics(account_row)
    account_spend = money(account_row)

    age_rows = [] if report_only else get(f"{account_id}/insights", {"level": "account", "fields": base_fields, "breakdowns": "age", "time_range": period, "limit": 100})
    region_rows = [] if report_only else get(f"{account_id}/insights", {"level": "account", "fields": base_fields, "breakdowns": "region", "time_range": period, "limit": 500})
    placement_rows = [] if report_only else get(f"{account_id}/insights", {"level": "account", "fields": base_fields, "breakdowns": "publisher_platform,platform_position", "time_range": period, "limit": 500})
    ad_ids = [row["ad_id"] for row in ad_rows if row.get("ad_id")]
    campaign_ids = sorted({row["campaign_id"] for row in ad_rows if row.get("campaign_id")})
    campaign_result_types: dict[str, set[str]] = {}
    for row in ad_rows:
        family = result_type(row)
        if row.get("campaign_id") and family != "Sem resultado atribuído":
            campaign_result_types.setdefault(row["campaign_id"], set()).add(family)
    ad_formats: dict[str, str] = {}
    ad_details: dict[str, dict] = {}
    campaign_objectives: dict[str, str] = {}
    for start in range(0, len(ad_ids), 50):
        batch = ",".join(ad_ids[start:start + 50])
        if not batch:
            continue
        query = urllib.parse.urlencode({"ids": batch, "fields": "id,status,effective_status,creative{id,name,object_type,video_id,image_hash,image_url,thumbnail_url,object_story_spec,asset_feed_spec}", "access_token": TOKEN})
        with urllib.request.urlopen(f"https://graph.facebook.com/{VERSION}/?{query}", timeout=50) as response:
            payload = json.load(response)
        for ad_id, item in payload.items():
            creative = item.get("creative") or {}
            story = creative.get("object_story_spec") or {}
            video_data = story.get("video_data") or {}
            link_data = story.get("link_data") or {}
            photo_data = story.get("photo_data") or {}
            preview_url = (
                creative.get("image_url")
                or video_data.get("image_url")
                or link_data.get("picture")
                or photo_data.get("url")
                or creative.get("thumbnail_url")
            )
            ad_formats[ad_id] = creative_format(creative)
            ad_details[ad_id] = {
                "status": item.get("status") or "UNKNOWN",
                "effective_status": item.get("effective_status") or item.get("status") or "UNKNOWN",
                "creative_id": creative.get("id"),
                "creative_name": creative.get("name"),
                "thumbnail_url": creative.get("thumbnail_url"),
                "preview_url": preview_url,
            }
    for start in range(0, len(campaign_ids), 50):
        batch = ",".join(campaign_ids[start:start + 50])
        if not batch:
            continue
        query = urllib.parse.urlencode({"ids": batch, "fields": "id,objective", "access_token": TOKEN})
        with urllib.request.urlopen(f"https://graph.facebook.com/{VERSION}/?{query}", timeout=50) as response:
            payload = json.load(response)
        for campaign_id, item in payload.items():
            campaign_objectives[campaign_id] = item.get("objective") or "Objetivo não informado"

    formats: dict[str, dict] = {}
    for row in ad_rows:
        label = ad_formats.get(row.get("ad_id"), "Não identificado")
        current = formats.setdefault(label, {"format": label, "spend": 0.0, "results": 0.0, "impressions": 0, "clicks": 0})
        item = metrics(row)
        for field in ("spend", "results", "impressions", "clicks"):
            current[field] += item[field]
    for item in formats.values():
        item["ctr"] = item["clicks"] / item["impressions"] * 100 if item["impressions"] else 0
        item["cpm"] = item["spend"] / item["impressions"] * 1000 if item["impressions"] else 0
        item["cost_per_result"] = item["spend"] / item["results"] if item["results"] else None

    age_spend = sum((money(row) for row in age_rows), Decimal("0"))
    region_spend = sum((money(row) for row in region_rows), Decimal("0"))
    placement_spend = sum((money(row) for row in placement_rows), Decimal("0"))
    ad_spend = sum((money(row) for row in ad_rows), Decimal("0"))
    return {
        "id": account_id,
        "reconciled": money_equal(ad_spend, account_spend),
        "account": account_metrics,
        "age": {"reconciled": False if report_only else money_equal(age_spend, account_spend), "rows": [{"age": row.get("age", "Não informado"), **metrics(row)} for row in age_rows]},
        "geography": {"level": "region", "reconciled": False if report_only else money_equal(region_spend, account_spend), "rows": [{"region": row.get("region", "Não informado"), **metrics(row)} for row in region_rows]},
        "placement": {"reconciled": False if report_only else money_equal(placement_spend, account_spend), "rows": [{"publisher_platform": row.get("publisher_platform", "unknown"), "platform_position": row.get("platform_position", "unknown"), **metrics(row)} for row in placement_rows]},
        "format": {"reconciled": money_equal(ad_spend, account_spend), "rows": list(formats.values())},
        "ads": [{"account_id": account_id, "ad_id": row.get("ad_id"), "ad_name": row.get("ad_name"), "campaign_id": row.get("campaign_id"), "campaign_name": row.get("campaign_name"), "objective": campaign_objectives.get(row.get("campaign_id"), "Objetivo não informado"), "result_type": (next(iter(campaign_result_types.get(row.get("campaign_id"), set()))) if len(campaign_result_types.get(row.get("campaign_id"), set())) == 1 else result_type(row)), "format": ad_formats.get(row.get("ad_id"), "Não identificado"), **ad_details.get(row.get("ad_id"), {}), **metrics(row)} for row in ad_rows],
        "audit": {"account_spend": float(account_spend), "age_sum": float(age_spend), "region_sum": float(region_spend), "placement_sum": float(placement_spend), "ad_sum": float(ad_spend)},
    }


def main() -> None:
    arguments = sys.argv[1:]
    report_only = os.environ.get("ANALYSIS_REPORT_ONLY") == "1" or "--report" in arguments
    arguments = [argument for argument in arguments if argument != "--report"]
    since, until, *account_ids = arguments
    if not account_ids:
        raise SystemExit("Informe ao menos uma conta.")
    period = json.dumps({"since": since, "until": until}, separators=(",", ":"))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        rows = list(pool.map(lambda account_id: breakdown(account_id, period, report_only), account_ids))
    print(json.dumps({"since": since, "until": until, "accounts": {row["id"]: row for row in rows}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
