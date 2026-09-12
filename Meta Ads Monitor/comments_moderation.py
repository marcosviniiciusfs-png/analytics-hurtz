from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import json
import os
import urllib.error
import urllib.parse
import urllib.request


VERSION = os.environ.get("META_API_VERSION", "v25.0")
TOKEN = os.environ["META_ACCESS_TOKEN"]
ACTIVE_STATUSES = {"ACTIVE"}


def graph(path: str, params: dict | None = None, method: str = "GET", token: str = TOKEN) -> dict:
    values = {**(params or {}), "access_token": token}
    encoded = urllib.parse.urlencode(values).encode()
    url = f"https://graph.facebook.com/{VERSION}/{path}"
    if method == "GET":
        url = f"{url}?{encoded.decode()}"
        data = None
    else:
        data = encoded
    request = urllib.request.Request(url, data=data, method=method)
    try:
        with urllib.request.urlopen(request, timeout=55) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        try:
            detail = json.load(error).get("error", {})
            message = detail.get("message") or f"Erro Meta {error.code}"
        except Exception:
            message = f"Erro Meta {error.code}"
        raise RuntimeError(message) from error


def graph_rows(path: str, params: dict, token: str = TOKEN) -> list[dict]:
    payload = graph(path, params, token=token)
    rows = list(payload.get("data", []))
    next_url = payload.get("paging", {}).get("next")
    page_count = 1
    while next_url and page_count < 8:
        with urllib.request.urlopen(next_url, timeout=55) as response:
            payload = json.load(response)
        rows.extend(payload.get("data", []))
        next_url = payload.get("paging", {}).get("next")
        page_count += 1
    return rows


def load_allowed_accounts() -> dict[str, str]:
    config_path = os.path.join(os.path.dirname(__file__), "monitored_accounts.json")
    with open(config_path, encoding="utf-8") as source:
        return {row["id"]: row.get("name", row["id"]) for row in json.load(source).get("accounts", [])}


def post_id_for_ad(ad: dict) -> str:
    creative = ad.get("creative") or {}
    return str(creative.get("effective_object_story_id") or creative.get("object_story_id") or "")


def fetch_comments(ad: dict, since: int | None) -> dict | None:
    post_id = post_id_for_ad(ad)
    if not post_id:
        return None
    params = {
        "fields": "id,message,created_time,like_count,comment_count,from{id,name},is_hidden,permalink_url",
        "filter": "stream",
        "order": "reverse_chronological",
        "limit": 100,
    }
    if since:
        params["since"] = since
    try:
        page_id = post_id.split("_", 1)[0]
        page_token = graph(page_id, {"fields": "access_token"}).get("access_token") or TOKEN
        comments = graph_rows(f"{post_id}/comments", params, token=page_token)
    except RuntimeError as error:
        return {"ad": ad, "comments": [], "warning": str(error)}
    if not comments:
        return None
    creative = ad.get("creative") or {}
    return {
        "ad": {
            "id": ad.get("id"),
            "name": ad.get("name") or "Anúncio sem nome",
            "effective_status": ad.get("effective_status") or "UNKNOWN",
            "campaign_name": (ad.get("campaign") or {}).get("name") or "Campanha não informada",
            "adset_name": (ad.get("adset") or {}).get("name") or "Conjunto não informado",
            "post_id": post_id,
            "thumbnail_url": creative.get("thumbnail_url") or "",
        },
        "comments": comments,
    }


def search(accounts: list[str], status: str, days: str) -> dict:
    allowed = load_allowed_accounts()
    selected = [account for account in accounts if account in allowed]
    if not selected:
        raise RuntimeError("Nenhuma conta autorizada foi selecionada.")
    since = None
    if days != "all":
        since = int((dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=max(1, min(365, int(days))))).timestamp())
    output: list[dict] = []
    warnings: list[dict] = []
    for account_id in selected:
        ads = graph_rows(f"{account_id}/ads", {
            "fields": "id,name,effective_status,campaign{name},adset{name},creative{id,object_story_id,effective_object_story_id,thumbnail_url}",
            "limit": 100,
        })
        if status == "active":
            ads = [ad for ad in ads if ad.get("effective_status") in ACTIVE_STATUSES]
        elif status == "inactive":
            ads = [ad for ad in ads if ad.get("effective_status") not in ACTIVE_STATUSES]
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            results = list(executor.map(lambda ad: fetch_comments(ad, since), ads))
        for result in results:
            if not result:
                continue
            if result.get("warning"):
                warnings.append({"account_id": account_id, "ad_id": result["ad"].get("id"), "message": result["warning"]})
                continue
            result["account_id"] = account_id
            result["account_name"] = allowed[account_id]
            output.append(result)
    output.sort(key=lambda item: max((comment.get("created_time", "") for comment in item["comments"]), default=""), reverse=True)
    return {"ads": output, "warnings": warnings, "accounts": len(selected), "comments": sum(len(item["comments"]) for item in output)}


def moderate(action: str, comment_ids: list[str]) -> dict:
    results = []
    for comment_id in comment_ids[:100]:
        try:
            if action == "delete":
                response = graph(comment_id, method="DELETE")
            else:
                response = graph(comment_id, {"is_hidden": "true" if action == "hide" else "false"}, method="POST")
            results.append({"id": comment_id, "ok": bool(response.get("success", True)), "response": response})
        except RuntimeError as error:
            results.append({"id": comment_id, "ok": False, "error": str(error)})
    return {"action": action, "results": results, "success": sum(1 for row in results if row["ok"]), "failed": sum(1 for row in results if not row["ok"])}


def diagnose() -> dict:
    rows = graph_rows("me/permissions", {"limit": 200})
    granted = sorted(row.get("permission") for row in rows if row.get("status") == "granted")
    relevant = [name for name in granted if name.startswith("pages_") or name.startswith("instagram_") or name.startswith("ads_") or name == "business_management"]
    return {"token_valid": True, "relevant_permissions": relevant, "can_read_page_comments": "pages_read_engagement" in granted, "can_manage_page_comments": "pages_manage_engagement" in granted}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("search", "moderate", "diagnose"))
    parser.add_argument("--accounts", default="")
    parser.add_argument("--status", choices=("active", "inactive", "all"), default="active")
    parser.add_argument("--days", default="30")
    parser.add_argument("--action", choices=("hide", "unhide", "delete"))
    parser.add_argument("--comments", default="")
    args = parser.parse_args()
    try:
        if args.mode == "diagnose":
            result = diagnose()
        elif args.mode == "search":
            result = search([value for value in args.accounts.split(",") if value], args.status, args.days)
        else:
            ids = [value for value in args.comments.split(",") if value]
            if not args.action or not ids:
                raise RuntimeError("Ação ou comentários não informados.")
            result = moderate(args.action, ids)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
