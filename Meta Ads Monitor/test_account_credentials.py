import json
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

import account_credentials as credentials


class CredentialTests(unittest.TestCase):
    def test_personal_report_never_uses_shared_credentials(self):
        with patch.dict(os.environ, {"META_USER_ACCESS_TOKEN": "personal-only"}):
            with patch.object(credentials, "connections", side_effect=AssertionError("Shared credentials accessed")):
                self.assertEqual(credentials.account_token("act_1187686609470801/insights", "shared"), "personal-only")

    def test_account_isolation_across_workers(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "connections.json"
            path.write_text(json.dumps({"connections": [{"access_token": "additional", "account_ids": ["act_123"]}]}))
            with patch.dict(os.environ, {"META_CONNECTIONS_FILE": str(path)}):
                credentials.connections.cache_clear()
                paths = ["act_123/insights", "act_456/campaigns", "me/adaccounts"] * 20
                with ThreadPoolExecutor(max_workers=8) as pool:
                    actual = list(pool.map(lambda p: credentials.account_token(p, "existing"), paths))
                self.assertEqual(actual, ["additional", "existing", "existing"] * 20)
                path.write_text('{"connections":[{"access_token":"secret"}]}')
                credentials.connections.cache_clear()
                with self.assertRaisesRegex(RuntimeError, "Configuracao"):
                    credentials.account_token("act_123", "existing")
        credentials.connections.cache_clear()

    def test_missing_file_preserves_existing_access(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {"META_CONNECTIONS_FILE": str(Path(directory) / "absent")}):
                credentials.connections.cache_clear()
                self.assertEqual(credentials.account_token("act_123", "existing"), "existing")
        credentials.connections.cache_clear()


if __name__ == "__main__":
    unittest.main()
