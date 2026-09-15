import io
import json
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch
import meta_query_guard as guard


class GuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.now = 1000000
        self.sleeps = []
        def sleep(seconds):
            self.sleeps.append(seconds)
            self.now += seconds
        self.policy = guard.QueryGuard(Path(self.temp.name) / 'state.sqlite', lambda: self.now, sleep)

    def test_shared_pacing_and_cooldown_survive_new_guard(self):
        self.policy.reserve(); self.policy.reserve()
        self.assertEqual(self.sleeps, [0.5])
        self.policy.pause(180)
        other = guard.QueryGuard(self.policy.database, lambda: self.now)
        with self.assertRaises(guard.MetaRateLimited) as raised: other.reserve()
        self.assertEqual(raised.exception.retry_after, 180)
        self.now += 181
        other.reserve()

    def test_usage_headers_slow_queries_and_honor_minutes(self):
        self.policy.feedback({'X-App-Usage': '{"call_count":90}'})
        self.policy.reserve(); self.assertEqual(self.sleeps, [2])
        self.policy.feedback({'X-Business-Use-Case-Usage': '{"business":[{"estimated_time_to_regain_access":5}]}'})
        with self.assertRaises(guard.MetaRateLimited) as raised: self.policy.reserve()
        self.assertEqual(raised.exception.retry_after, 300)

    def test_1504022_is_not_retried_and_next_call_never_reaches_network(self):
        error = urllib.error.HTTPError('https://graph.facebook.com/?access_token=secret', 400, 'blocked', {}, io.BytesIO(json.dumps({'error': {'code':4,'error_subcode':1504022}}).encode()))
        with patch.object(guard,'_guard',self.policy), patch.object(guard.urllib.request,'urlopen',side_effect=error) as opener:
            for _ in range(2):
                with self.assertRaises(guard.MetaRateLimited) as raised: guard.get_json('https://graph.facebook.com/test')
                self.assertNotIn('secret',str(raised.exception))
            self.assertEqual(opener.call_count,1)

    def test_transient_failure_retries_only_once(self):
        error = lambda: urllib.error.HTTPError('url',503,'unavailable',{},io.BytesIO(b'{}'))
        with patch.object(guard,'_guard',self.policy), patch.object(guard.urllib.request,'urlopen',side_effect=[error(),error()]) as opener:
            with self.assertRaises(RuntimeError): guard.get_json('url')
            self.assertEqual(opener.call_count,2)

    def test_permission_failure_is_not_retried(self):
        error=urllib.error.HTTPError('url',403,'denied',{},io.BytesIO(b'{"error":{"code":200}}'))
        with patch.object(guard,'_guard',self.policy), patch.object(guard.urllib.request,'urlopen',side_effect=error) as opener:
            with self.assertRaises(RuntimeError): guard.get_json('url')
            self.assertEqual(opener.call_count,1)

    def test_later_limit_events_back_off_progressively(self):
        self.assertEqual(self.policy.pause(),120)
        self.now+=121
        self.assertEqual(self.policy.pause(),240)


if __name__ == '__main__': unittest.main()
