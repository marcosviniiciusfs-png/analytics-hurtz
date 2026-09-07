"""Run a single user's report; accept credentials via stdin, never command arguments."""
import concurrent.futures
import json
import os
import re
import sys


def main():
    payload = json.loads(sys.stdin.read(65536))
    ids = payload['ids']
    if not ids or len(ids) > 100 or any(not re.fullmatch(r'act_\d+', value) for value in ids):
        raise ValueError('Invalid accounts')
    os.environ['META_ACCESS_TOKEN'] = payload['token']
    os.environ['META_USER_ACCESS_TOKEN'] = payload['token']
    os.environ['META_API_VERSION'] = 'v25.0'
    from dashboard_spend import audit
    from analysis_breakdowns import breakdown
    period = json.dumps({'since': payload['from'], 'until': payload['to']})
    def collect(account_id):
        return audit(account_id, period) if payload['kind'] == 'spend' else breakdown(account_id, period, payload.get('reportOnly', False))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        rows = list(pool.map(collect, ids))
    print(json.dumps({'since': payload['from'], 'until': payload['to'], 'accounts': {row['id']: row for row in rows}}))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Upstream exceptions can contain request URLs and tokens.
        print(json.dumps({'error': 'Falha na consulta individual da Meta.'}))
        sys.exit(1)
