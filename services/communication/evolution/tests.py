from unittest.mock import Mock, patch

import requests
from django.test import TestCase, override_settings

from services.communication.evolution.models import EvolutionApiLog
from services.communication.evolution.requests import EvolutionRequestClient


@override_settings(
    EVOLUTION_API_URL="http://evolution.test",
    EVOLUTION_INSTANCE="instance-1",
    EVOLUTION_API_KEY="secret",
    EVOLUTION_REQUEST_TIMEOUT=5,
)
class EvolutionLoggingTests(TestCase):
    def test_post_persists_success_log_with_sanitized_media(self):
        client = EvolutionRequestClient()
        response = Mock()
        response.status_code = 201
        response.content = b'{"key":{"id":"msg-1"}}'
        response.text = '{"key":{"id":"msg-1"}}'
        response.json.return_value = {"key": {"id": "msg-1"}}

        with patch.object(client.session, "request", return_value=response) as mocked_request:
            result = client.post(
                f"/message/sendMedia/{client.instance}",
                {
                    "number": "5543999999999",
                    "media": "a" * 4000,
                    "caption": "Teste",
                },
            )

        mocked_request.assert_called_once()
        self.assertEqual(result["_http_status"], 201)

        log = EvolutionApiLog.objects.get()
        self.assertEqual(log.operation, "message.sendMedia")
        self.assertEqual(log.request_method, "POST")
        self.assertEqual(log.target_number, "5543999999999")
        self.assertTrue(log.success)
        self.assertEqual(log.status_code, 201)
        self.assertEqual(
            log.request_data["media"],
            {
                "preview": f"{'a' * 120}...",
                "truncated": True,
                "original_length": 4000,
            },
        )
        self.assertEqual(log.response_data["key"]["id"], "msg-1")

    def test_post_logs_exception_and_preserves_failure_behavior(self):
        client = EvolutionRequestClient()

        with patch.object(
            client.session,
            "request",
            side_effect=requests.RequestException("timeout talking to evolution"),
        ):
            with self.assertRaises(requests.RequestException):
                client.post(
                    f"/message/sendText/{client.instance}",
                    {
                        "number": "5543988887777",
                        "text": "Ola",
                    },
                )

        log = EvolutionApiLog.objects.get()
        self.assertEqual(log.operation, "message.sendText")
        self.assertEqual(log.request_method, "POST")
        self.assertEqual(log.target_number, "5543988887777")
        self.assertFalse(log.success)
        self.assertIsNone(log.status_code)
        self.assertIn("timeout talking to evolution", log.error_message)
