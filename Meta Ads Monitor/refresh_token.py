from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

from env_utils import load_env, replace_env_value_atomic


DEFAULT_ENV = Path("/opt/meta-ads-cli/secrets/.env")


def api_json(url: str, params: dict[str, str], timeout: int = 30) -> dict:
    try:
        response = requests.get(url, params=params, timeout=timeout)
    except requests.RequestException as exc:
        raise RuntimeError(f"Falha de rede ao consultar a Meta: {type(exc).__name__}") from None

    try:
        payload = response.json()
    except ValueError:
        raise RuntimeError(f"Resposta invalida da Meta (HTTP {response.status_code})") from None

    if response.status_code >= 400 or "error" in payload:
        error = payload.get("error", {})
        code = error.get("code", "desconhecido")
        message = error.get("message", "erro sem descricao")
        raise RuntimeError(f"Meta API recusou a operacao (HTTP {response.status_code}, codigo {code}): {message}")
    return payload


def debug_token(api_version: str, token: str, app_id: str, app_secret: str) -> dict:
    payload = api_json(
        f"https://graph.facebook.com/{api_version}/debug_token",
        {"input_token": token, "access_token": f"{app_id}|{app_secret}"},
    )
    return payload.get("data", {})


def exchange_token(api_version: str, token: str, app_id: str, app_secret: str) -> str:
    payload = api_json(
        f"https://graph.facebook.com/{api_version}/oauth/access_token",
        {
            "grant_type": "fb_exchange_token",
            "client_id": app_id,
            "client_secret": app_secret,
            "fb_exchange_token": token,
        },
    )
    new_token = payload.get("access_token")
    if not new_token:
        raise RuntimeError("A Meta nao retornou um novo access token")
    return str(new_token)


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida e renova o token Meta sem expo-lo em logs.")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV)
    parser.add_argument("--force", action="store_true", help="Forca a troca mesmo se o token ainda tiver validade longa.")
    parser.add_argument("--refresh-before-days", type=int, default=14)
    args = parser.parse_args()

    try:
        env = load_env(args.env_file)
        version = env.get("META_API_VERSION", "v25.0")
        token = env["META_ACCESS_TOKEN"]
        app_id = env["META_APP_ID"]
        app_secret = env["META_APP_SECRET"]

        status = debug_token(version, token, app_id, app_secret)
        if not status.get("is_valid"):
            raise RuntimeError("O token atual foi informado como invalido pela Meta")

        expires_at = int(status.get("expires_at") or 0)
        now = int(datetime.now(timezone.utc).timestamp())
        remaining_days = max(0, (expires_at - now) // 86400) if expires_at else 0
        print(f"Token valido. Dias restantes: {remaining_days if expires_at else 'nao informado'}")

        if not args.force and expires_at and remaining_days > args.refresh_before_days:
            print("Renovacao ainda nao necessaria.")
            return 0

        new_token = exchange_token(version, token, app_id, app_secret)
        replace_env_value_atomic(args.env_file, "META_ACCESS_TOKEN", new_token)
        refreshed = debug_token(version, new_token, app_id, app_secret)
        if not refreshed.get("is_valid"):
            raise RuntimeError("O novo token nao passou na validacao posterior")
        new_expiry = int(refreshed.get("expires_at") or 0)
        new_days = max(0, (new_expiry - now) // 86400) if new_expiry else 0
        print(f"Token renovado com seguranca. Nova validade: {new_days if new_expiry else 'nao informada'} dias.")
        return 0
    except RuntimeError as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
