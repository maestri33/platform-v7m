"""Testes do app ``integrations.ai`` (M1.7).

Cobre o motor de fallback + LLMClient + AiCall + helpers. Não testa os
provedores de mídia (ElevenLabs/MiniMax/Gemini/Vision) com chamadas reais
— esses têm teste próprio em ``services/ai/`` até M1.10.
"""

from unittest import mock

from django.core.exceptions import ImproperlyConfigured
from django.test import TestCase, override_settings

from integrations.ai import providers
from integrations.ai.client import (
    RETRYABLE_STATUS,
    LLMClient,
    LLMClientError,
)
from integrations.ai.models import AiCall
from integrations.ai.service import (
    _strip_think,
    generate_text,
    is_retryable_error,
)


class AiCallModelTest(TestCase):
    def test_create_with_required_fields(self):
        call = AiCall.objects.create(
            provider="groq",
            operation=AiCall.Operation.TEXT,
            model="llama-3.3-70b",
            caller="apps.worship.services",
            status=AiCall.Status.SUCCESS,
            latency_ms=123,
        )
        self.assertEqual(call.provider, "groq")
        self.assertEqual(call.model, "llama-3.3-70b")
        self.assertEqual(call.operation, "text")
        self.assertEqual(call.caller, "apps.worship.services")
        self.assertEqual(call.status, "success")
        self.assertEqual(call.latency_ms, 123)
        self.assertIsNotNone(call.created_at)

    def test_create_error_with_error_message(self):
        call = AiCall.objects.create(
            provider="deepseek",
            operation=AiCall.Operation.JSON,
            model="deepseek-chat",
            caller="apps.lms.scoring",
            status=AiCall.Status.ERROR,
            latency_ms=4567,
            error_code="429",
            error_message="rate limited",
        )
        self.assertEqual(call.status, "error")
        self.assertEqual(call.error_code, "429")
        self.assertEqual(call.error_message, "rate limited")

    def test_db_table_is_ai_call(self):
        self.assertEqual(AiCall._meta.db_table, "ai_call")

    def test_ordering_descending(self):
        AiCall.objects.create(
            provider="groq",
            operation="text",
            model="m",
            caller="t",
            status="success",
            latency_ms=1,
        )
        call2 = AiCall.objects.create(
            provider="groq",
            operation="text",
            model="m",
            caller="t",
            status="success",
            latency_ms=1,
        )
        # Mais recente primeiro
        results = list(AiCall.objects.all())
        self.assertEqual(results[0], call2)


class FallbackChainTest(TestCase):
    @override_settings(
        IA_FALLBACK_CHAIN="groq:llama-3.3-70b,deepseek:deepseek-chat",
        IA_ENABLED_GROQ=True,
        IA_GROQ_BASE_URL="https://api.groq.com/openai/v1",
        IA_GROQ_API_KEY="gsk_test",
    )
    def test_fallback_chain_parses_csv(self):
        chain = providers.fallback_chain()
        self.assertEqual(
            chain,
            [("groq", "llama-3.3-70b"), ("deepseek", "deepseek-chat")],
        )

    @override_settings(IA_FALLBACK_CHAIN="")
    def test_fallback_chain_empty_when_not_set(self):
        self.assertEqual(providers.fallback_chain(), [])

    @override_settings(
        IA_FALLBACK_CHAIN="groq:llama-3.3-70b,groq:other-model,deepseek:deepseek-chat"
    )
    def test_fallback_chain_filtered_by_model(self):
        chain = providers.fallback_chain("llama-3.3-70b")
        self.assertEqual(chain, [("groq", "llama-3.3-70b")])

    @override_settings(IA_FALLBACK_CHAIN="groq:llama-3.3-70b,deepseek:deepseek-chat")
    def test_fallback_chain_unknown_model_raises(self):
        with self.assertRaises(ImproperlyConfigured):
            providers.fallback_chain("model-que-nao-existe")

    @override_settings(
        IA_FALLBACK_CHAIN="groq:llama-3.3-70b, deepseek : deepseek-chat , "
    )
    def test_fallback_chain_tolerates_whitespace(self):
        chain = providers.fallback_chain()
        self.assertEqual(len(chain), 2)
        self.assertEqual(chain[1][0], "deepseek")
        self.assertEqual(chain[1][1], "deepseek-chat")


class GetClientTest(TestCase):
    @override_settings(
        IA_GROQ_BASE_URL="https://api.groq.com/openai/v1",
        IA_GROQ_API_KEY="gsk_test",
    )
    def test_get_client_returns_dict_with_credentials(self):
        cfg = providers.get_client("groq")
        self.assertEqual(cfg["base_url"], "https://api.groq.com/openai/v1")
        self.assertEqual(cfg["api_key"], "gsk_test")

    @override_settings(
        IA_GROQ_BASE_URL="",
        IA_GROQ_API_KEY="gsk_test",
    )
    def test_get_client_raises_when_missing_credential(self):
        with self.assertRaises(ImproperlyConfigured):
            providers.get_client("groq")


class EnabledProvidersTest(TestCase):
    @override_settings(
        IA_ENABLED_GROQ=True,
        IA_GROQ_BASE_URL="https://api.groq.com/openai/v1",
        IA_GROQ_API_KEY="gsk_test",
    )
    def test_enabled_returns_flagged_with_credential(self):
        providers_list = providers.enabled_providers()
        self.assertIn("groq", providers_list)

    @override_settings(
        IA_ENABLED_GROQ=True,
        IA_GROQ_BASE_URL="",
        IA_GROQ_API_KEY="",
    )
    def test_enabled_excludes_without_credential(self):
        # Flag ligado mas sem credencial — não entra.
        providers_list = providers.enabled_providers()
        self.assertNotIn("groq", providers_list)


class LLMClientTest(TestCase):
    def _fake_response(self, status_code, body=None):
        resp = mock.Mock()
        resp.status_code = status_code
        resp.text = "ok" if body is None else str(body)
        resp.content = b""
        resp.json.return_value = body or {
            "choices": [{"message": {"content": "ola"}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 5, "completion_tokens": 3},
        }
        return resp

    @mock.patch("integrations.ai.client.requests.post")
    def test_succeeds_on_first_attempt(self, mock_post):
        mock_post.return_value = self._fake_response(200)
        client = LLMClient(
            base_url="https://api.groq.com/openai/v1",
            api_key="gsk_test",
            max_retries=3,
        )
        result = client.text("oi", model="llama-3.3-70b")
        self.assertEqual(result.text, "ola")
        self.assertEqual(result.prompt_tokens, 5)
        self.assertEqual(result.completion_tokens, 3)
        self.assertEqual(mock_post.call_count, 1)

    @mock.patch("integrations.ai.client.requests.post")
    def test_retries_on_429(self, mock_post):
        mock_post.side_effect = [
            self._fake_response(429),
            self._fake_response(200),
        ]
        client = LLMClient(
            base_url="https://api.groq.com/openai/v1",
            api_key="gsk_test",
            max_retries=3,
        )
        result = client.text("oi", model="llama-3.3-70b")
        self.assertEqual(result.text, "ola")
        self.assertEqual(mock_post.call_count, 2)

    @mock.patch("integrations.ai.client.requests.post")
    def test_retries_on_500(self, mock_post):
        mock_post.side_effect = [
            self._fake_response(500),
            self._fake_response(503),
            self._fake_response(200),
        ]
        client = LLMClient(
            base_url="https://api.groq.com/openai/v1",
            api_key="gsk_test",
            max_retries=3,
        )
        result = client.text("oi", model="llama-3.3-70b")
        self.assertEqual(result.text, "ola")
        self.assertEqual(mock_post.call_count, 3)

    @mock.patch("integrations.ai.client.requests.post")
    def test_raises_non_retryable_on_400(self, mock_post):
        mock_post.return_value = self._fake_response(400, body="bad input")
        client = LLMClient(
            base_url="https://api.groq.com/openai/v1",
            api_key="gsk_test",
            max_retries=3,
        )
        with self.assertRaises(LLMClientError) as ctx:
            client.text("oi", model="llama-3.3-70b")
        self.assertFalse(ctx.exception.retryable)
        self.assertEqual(mock_post.call_count, 1)

    def test_retryable_status_constants(self):
        self.assertIn(429, RETRYABLE_STATUS)
        self.assertIn(500, RETRYABLE_STATUS)
        self.assertIn(503, RETRYABLE_STATUS)
        self.assertNotIn(400, RETRYABLE_STATUS)


class ServiceGenerateTextTest(TestCase):
    @override_settings(
        IA_FALLBACK_CHAIN="groq:llama-3.3-70b,deepseek:deepseek-chat",
        IA_ENABLED_GROQ=True,
        IA_GROQ_BASE_URL="https://api.groq.com/openai/v1",
        IA_GROQ_API_KEY="gsk_test",
    )
    @mock.patch("integrations.ai.client.requests.post")
    def test_generate_text_walks_chain_and_records_success(self, mock_post):
        mock_post.return_value = mock.Mock(
            status_code=200,
            text="ok",
            content=b"",
            json=mock.Mock(return_value={
                "choices": [{"message": {"content": "ola mundo"}, "finish_reason": "stop"}],
                "usage": {"prompt_tokens": 4, "completion_tokens": 6},
            }),
        )
        result = generate_text(
            prompt="diga ola", caller="apps.worship.services"
        )
        self.assertEqual(result, "ola mundo")
        call = AiCall.objects.get(provider="groq")
        self.assertEqual(call.status, AiCall.Status.SUCCESS)
        self.assertEqual(call.operation, AiCall.Operation.TEXT)
        self.assertEqual(call.prompt_tokens, 4)
        self.assertEqual(call.completion_tokens, 6)

    @override_settings(
        IA_FALLBACK_CHAIN="groq:llama-3.3-70b,deepseek:deepseek-chat",
        IA_ENABLED_GROQ=True,
        IA_GROQ_BASE_URL="https://api.groq.com/openai/v1",
        IA_GROQ_API_KEY="gsk_test",
    )
    @mock.patch("integrations.ai.client.requests.post")
    def test_generate_text_records_error_when_all_fail(self, mock_post):
        # requests.exceptions.RequestException é o que o LLMClient pega como retryable.
        import requests as _req
        mock_post.side_effect = _req.exceptions.ConnectionError("rede caiu")
        with self.assertRaises(Exception):
            generate_text(
                prompt="diga ola", caller="apps.worship.services"
            )
        # 2 AiCall de erro (groq falhou, deepseek falhou).
        self.assertEqual(AiCall.objects.count(), 2)
        self.assertTrue(
            all(c.status == AiCall.Status.ERROR for c in AiCall.objects.all())
        )


class StripThinkTest(TestCase):
    def test_removes_think_block(self):
        text = "<think>vou raciocinar</think>Resposta final."
        self.assertEqual(_strip_think(text), "Resposta final.")

    def test_preserves_text_without_think(self):
        self.assertEqual(_strip_think("sem raciocinio"), "sem raciocinio")

    def test_handles_empty(self):
        self.assertEqual(_strip_think(""), "")
        self.assertEqual(_strip_think(None), "")

    def test_handles_multiline_think(self):
        text = "<think>\nlinha 1\nlinha 2\n</think>\nsaida"
        self.assertEqual(_strip_think(text), "saida")


class IsRetryableErrorTest(TestCase):
    def test_llm_client_error_with_retryable_true(self):
        exc = LLMClientError("boom", retryable=True, status_code=429)
        self.assertTrue(is_retryable_error(exc))

    def test_llm_client_error_with_retryable_false(self):
        exc = LLMClientError("boom", retryable=False, status_code=400)
        self.assertFalse(is_retryable_error(exc))

    def test_random_exception_returns_false(self):
        self.assertFalse(is_retryable_error(ValueError("x")))
