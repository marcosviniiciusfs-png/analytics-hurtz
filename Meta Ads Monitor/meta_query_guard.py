"""Pace read-only Graph queries across worker processes; never retry writes."""
import json
import math
import os
import random
import sqlite3
import tempfile
import time
import urllib.error
import urllib.request
import threading
from contextlib import contextmanager
from pathlib import Path


class MetaRateLimited(Exception):
    def __init__(self, retry_after=120):
        self.retry_after = max(1, math.ceil(retry_after))
        super().__init__('A Meta limitou temporariamente as consultas.')


class QueryGuard:
    def __init__(self, database=None, clock=time.time, sleep=time.sleep):
        self.clock, self.sleep = clock, sleep
        shared = '/opt/meta-ads-cli/secrets' if Path('/opt/meta-ads-cli/secrets').is_dir() else tempfile.gettempdir()
        self.database = str(database or Path(os.environ.get('META_QUERY_STATE_DIR', shared)) / 'hurtz-meta-query-policy.sqlite')
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS policy (id INTEGER PRIMARY KEY, next_at REAL, blocked_until REAL, strikes INTEGER, last_limit REAL)')
            db.execute('INSERT OR IGNORE INTO policy VALUES (1,0,0,0,0)')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.database, timeout=10)
        try:
            with db:
                yield db
        finally:
            db.close()

    def reserve(self):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            next_at, blocked, _, _ = db.execute('SELECT next_at,blocked_until,strikes,last_limit FROM policy WHERE id=1').fetchone()
            now = self.clock()
            if blocked > now:
                raise MetaRateLimited(blocked - now)
            start = max(now, next_at)
            db.execute('UPDATE policy SET next_at=? WHERE id=1', (start + 0.5,))
        if start > now:
            self.sleep(start - now)
        # A sibling process may have tripped the circuit during this wait.
        with self.connect() as db:
            blocked = db.execute('SELECT blocked_until FROM policy WHERE id=1').fetchone()[0]
        if blocked > self.clock():
            raise MetaRateLimited(blocked - self.clock())

    def pause(self, seconds=120):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            blocked, strikes, last = db.execute('SELECT blocked_until,strikes,last_limit FROM policy WHERE id=1').fetchone()
            now = self.clock()
            # Concurrent failures belong to the same rate-limit event.
            strikes = (strikes + 1 if now - last > 10 else strikes) if now - last < 3600 else 1
            seconds = max(seconds, min(1800, 120 * 2 ** max(0, strikes - 1)))
            until = max(blocked, now + seconds)
            db.execute('UPDATE policy SET blocked_until=?,strikes=?,last_limit=? WHERE id=1', (until, strikes, now))
        return until - now

    def feedback(self, headers, limited=False):
        headers = headers or {}
        seconds, usage = 0, 0
        def walk(value):
            nonlocal seconds, usage
            if isinstance(value, list):
                for item in value: walk(item)
            if isinstance(value, dict):
                for key, item in value.items():
                    if isinstance(item, (int, float)):
                        if key == 'estimated_time_to_regain_access': seconds = max(seconds, item * 60)
                        if key in ('call_count', 'total_cputime', 'total_time', 'acc_id_util_pct', 'app_id_util_pct'): usage = max(usage, item)
                    else: walk(item)
        for name in ('X-App-Usage', 'X-Business-Use-Case-Usage', 'X-Ad-Account-Usage', 'X-FB-Ads-Insights-Throttle'):
            try: walk(json.loads(headers.get(name, '{}')))
            except (TypeError, ValueError): pass
        try: seconds = max(seconds, float(headers.get('Retry-After', 0)))
        except (TypeError, ValueError): pass
        if limited or seconds > 0:
            return self.pause(max(120, seconds))
        if usage >= 85:
            with self.connect() as db:
                db.execute('UPDATE policy SET next_at=MAX(next_at,?) WHERE id=1', (self.clock() + (10 if usage >= 95 else 2),))
        return 0


_guard = None
_slots = threading.BoundedSemaphore(2)


def get_json(url, timeout=50):
    with _slots:
        return _get_json(url, timeout)


def _get_json(url, timeout=50):
    global _guard
    if _guard is None: _guard = QueryGuard()
    for attempt in range(2):
        _guard.reserve()
        try:
            with urllib.request.urlopen(url, timeout=timeout) as response:
                payload = json.load(response)
                headers = getattr(response, 'headers', {})
                if payload.get('error'):
                    error = payload['error']
                    if error.get('error_subcode') == 1504022 or error.get('code') in (4, 17, 32, 613) or 80000 <= error.get('code', 0) <= 80014:
                        raise MetaRateLimited(_guard.feedback(headers, True))
                    raise RuntimeError('A Meta recusou a consulta.')
                _guard.feedback(headers)
                return payload
        except urllib.error.HTTPError as exc:
            try: error = json.loads(exc.read()).get('error', {})
            except (ValueError, TypeError): error = {}
            code = error.get('code', 0)
            if exc.code == 429 or code in (4, 17, 32, 613) or 80000 <= code <= 80014 or error.get('error_subcode') == 1504022:
                raise MetaRateLimited(_guard.feedback(exc.headers, True)) from None
            if exc.code in (500, 502, 503, 504) and attempt == 0:
                _guard.sleep(1 + random.random())
                continue
            raise RuntimeError('A Meta recusou a consulta.') from None
