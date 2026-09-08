import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from datetime import datetime
import alert_engine as engine


class LocalAlertsTests(unittest.TestCase):
    def test_dry_run_does_not_call_whatsapp(self):
        with patch.object(engine.urllib.request, 'urlopen', side_effect=AssertionError('No real messages')):
            self.assertEqual(engine.evolution_send('Test', {'dry_run': True}), (True, 'dry-run'))

    def test_threshold_requires_reconciliation_and_deduplicates(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(engine, 'DATA_DIR', Path(folder)), patch.object(engine, 'HISTORY_PATH', Path(folder)/'history.jsonl'):
                config={**engine.DEFAULT_CONFIG,'dry_run':True,'thresholds':[100],'velocity_enabled':False}
                state={'sent':{}}
                payload={'accounts':{'act_111':{'id':'act_111','spend':120,'reconciled':False}}}
                plans={'act_111':{'dailyLimit':100}}
                self.assertEqual(engine.financial_alerts(payload,plans,state,config),0)
                payload['accounts']['act_111']['reconciled']=True
                self.assertEqual(engine.financial_alerts(payload,plans,state,config),1)
                self.assertEqual(engine.financial_alerts(payload,plans,state,config),0)
                self.assertIn('dry-run',(Path(folder)/'history.jsonl').read_text(encoding='utf-8'))

    def test_quiet_window_crosses_midnight(self):
        config={'quiet_start':'21:00','quiet_end':'07:00'}
        self.assertTrue(engine.quiet_now(config,datetime(2026,9,8,23,0,tzinfo=engine.TZ)))
        self.assertFalse(engine.quiet_now(config,datetime(2026,9,8,10,0,tzinfo=engine.TZ)))

if __name__=='__main__':
    unittest.main()
