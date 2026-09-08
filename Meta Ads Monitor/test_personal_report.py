import unittest
from personal_report import collect_accounts


class PersonalReportTests(unittest.TestCase):
    def test_one_failed_account_does_not_drop_successful_accounts_or_fake_zero(self):
        def collect(account):
            if account == 'act_222':
                raise RuntimeError('https://graph.facebook.com/?access_token=secret')
            return {'id': account, 'reconciled': True, 'spend': 42.5}
        result = collect_accounts(['act_111', 'act_222', 'act_333'], collect)
        self.assertEqual(result['act_111']['spend'], 42.5)
        self.assertEqual(result['act_333']['spend'], 42.5)
        self.assertFalse(result['act_222']['reconciled'])
        self.assertNotIn('spend', result['act_222'])
        self.assertNotIn('secret', str(result))


if __name__ == '__main__':
    unittest.main()
