"""Run a single user's report; accept credentials via stdin, never command arguments."""
import concurrent.futures
import json
import os
import re
import sys


def collect_accounts(ids, collect):
    def safe_collect(account_id):
        try:
            return collect(account_id)
        except Exception:
            # Never serialize upstream exceptions: URLs may include credentials.
            return {'id': account_id, 'reconciled': False, 'result_reconciled': False,
                    'error': 'A Meta não liberou a auditoria desta conta neste período. Verifique as permissões ou tente atualizar.',
                    'campaigns': [], 'daily': []}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        return {row['id']: row for row in pool.map(safe_collect, ids)}


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
    print(json.dumps({'since': payload['from'], 'until': payload['to'], 'accounts': collect_accounts(ids, collect)}))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Upstream exceptions can contain request URLs and tokens.
        print(json.dumps({'error': 'Falha na consulta individual da Meta.'}))
        sys.exit(1)
