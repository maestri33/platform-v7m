import base64
import hashlib
import hmac
import json
import threading
import time
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch

import agent


SECRET = b"presence-test-secret"
MAC = "aa:bb:cc:dd:ee:ff"


def credential(*, mac=MAC, expires_at=None, sid="session-1"):
    payload = {
        "mac": mac,
        "sid": sid,
        "exp": expires_at if expires_at is not None else time.time() + 60,
    }
    raw = json.dumps(payload, separators=(",", ":")).encode()
    encoded = base64.urlsafe_b64encode(raw).decode().rstrip("=")
    signature = hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


class CredentialTests(unittest.TestCase):
    def setUp(self):
        self.secret = agent.AGENT_SECRET
        agent.AGENT_SECRET = SECRET

    def tearDown(self):
        agent.AGENT_SECRET = self.secret

    def test_valid_credential_is_normalized(self):
        payload = agent.verify_credential(credential(mac="AA-BB-CC-DD-EE-FF"))
        self.assertEqual(payload["mac"], MAC)

    def test_tampered_credential_is_rejected(self):
        value = credential()
        encoded, _signature = value.rsplit(".", 1)
        self.assertIsNone(agent.verify_credential(f"{encoded}.{'0' * 64}"))

    def test_expired_credential_is_rejected(self):
        self.assertIsNone(agent.verify_credential(credential(expires_at=time.time() - 1)))

    def test_invalid_mac_is_rejected(self):
        self.assertIsNone(agent.verify_credential(credential(mac="not-a-mac")))


class GrantTests(unittest.TestCase):
    def setUp(self):
        self.secret = agent.AGENT_SECRET
        agent.AGENT_SECRET = SECRET
        agent.APPLIED.clear()

    def tearDown(self):
        agent.AGENT_SECRET = self.secret
        agent.APPLIED.clear()

    @patch.object(agent, "cloud", return_value=(200, {"acked": True}))
    @patch.object(agent, "run_hook", return_value=True)
    def test_apply_grant_is_idempotent(self, run_hook, cloud):
        value = credential()
        self.assertTrue(agent.apply_grant({"credential": value, "mac": MAC}))
        self.assertTrue(agent.apply_grant({"credential": value, "mac": MAC}))
        run_hook.assert_called_once()
        cloud.assert_called_once()


class ListenerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = agent.AgentServer(("127.0.0.1", 0), agent.PushHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def test_health_is_safe_and_available(self):
        with urllib.request.urlopen(f"{self.base_url}/health", timeout=2) as response:
            payload = json.load(response)
        self.assertEqual(payload["status"], "ok")
        self.assertNotIn("secret", json.dumps(payload).lower())

    def test_unsigned_grant_is_rejected(self):
        request = urllib.request.Request(
            f"{self.base_url}/grant",
            data=b"{}",
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request, timeout=2)
        self.assertEqual(caught.exception.code, 403)

    def test_signed_invalid_json_returns_400(self):
        body = b"not-json"
        signature = hmac.new(agent.AGENT_SECRET, body, hashlib.sha256).hexdigest()
        request = urllib.request.Request(
            f"{self.base_url}/grant",
            data=body,
            method="POST",
            headers={"X-Captive-Signature": signature},
        )
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request, timeout=2)
        self.assertEqual(caught.exception.code, 400)

    def test_oversized_grant_is_rejected_before_read(self):
        request = urllib.request.Request(
            f"{self.base_url}/grant",
            data=b"{}",
            method="POST",
            headers={"Content-Length": str(agent.MAX_GRANT_BODY_BYTES + 1)},
        )
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request, timeout=2)
        self.assertEqual(caught.exception.code, 413)


if __name__ == "__main__":
    unittest.main()
