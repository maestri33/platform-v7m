"""Client LLM genérico — qualquer provider OpenAI-compatible (POST /chat/completions).

Groq, DeepSeek, OpenAI, MiniMax-LLM… todos falam o mesmo protocolo; o que
muda é ``base_url`` + ``api_key`` (vêm do registry, providers.get_client).
**Zero regra de negócio aqui**: só fala com o provider e devolve o resultado
cru + métricas. Quem dá sentido (parse/contrato) é a interface (service.py).

Erros são tipados com ``retryable``: rede/timeout/429/5xx = retryable
(o service cai pro próximo provider); 4xx de input = não-retryable
(bug do caller). Métricas de cache (cache_hit/miss_tokens) são lidas com
default 0 — só alguns providers (DeepSeek) as mandam.

Síncrono (requests) — casa com o resto do IEADPG (que já usa requests em
``integrations.communication.evolution.requests``). Não adicionar httpx.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

import requests

logger = logging.getLogger(__name__)

# Status HTTP que valem nova tentativa (intra-provider) e, esgotadas, fallback (inter-provider).
RETRYABLE_STATUS = {429, 500, 502, 503, 504}

# System prompt padrão pt-br — garante tom natural e pt-br correto.
SYSTEM_PROMPT_PT = (
    "Voce responde SEMPRE em portugues brasileiro com acentuacao e pontuacao corretas. "
    "Tom natural, nao-formal, nao-robotico. "
    "NUNCA use {{variavel}} no output. "
    "Sem meta-comentarios, sem aspas, sem markdown."
)


class LLMClientError(Exception):
    """Erro ao falar com um provider de IA. ``retryable`` decide o fallback."""

    def __init__(
        self,
        message: str,
        *,
        retryable: bool,
        status_code: int = 0,
        body: str = "",
    ):
        super().__init__(message)
        self.retryable = retryable
        self.status_code = status_code
        self.body = body


@dataclass
class ChatResult:
    """Resultado de uma chamada ao modelo: o texto + as métricas de token/cache."""

    text: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cache_hit_tokens: int = 0
    cache_miss_tokens: int = 0
    finish_reason: str = ""
    raw: dict | None = None

    @property
    def cache_hit_rate(self) -> float:
        total = self.cache_hit_tokens + self.cache_miss_tokens
        return self.cache_hit_tokens / total if total else 0.0


class LLMClient:
    """Cliente fino sobre um provider OpenAI-compatible (síncrono)."""

    def __init__(
        self,
        base_url: str,
        api_key: str,
        *,
        timeout: int = 30,
        max_retries: int = 3,
        default_temperature: float = 0.7,
        default_max_tokens: int = 1024,
    ):
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = timeout
        self._max_retries = max_retries
        self._default_temperature = default_temperature
        self._default_max_tokens = default_max_tokens

    # ---------- low-level ----------

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    def _build_payload(
        self,
        messages: list[dict],
        *,
        model: str,
        temperature: float | None = None,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> dict:
        payload: dict = {
            "model": model,
            # OmniRouter (e afins) streama por padrao (SSE); o parse aqui e
            # single-JSON (resp.json()). Forcamos non-stream sempre — todo
            # provider OpenAI-compatible aceita. (2026-07-19)
            "stream": False,
            "messages": messages,
            "temperature": (
                temperature if temperature is not None else self._default_temperature
            ),
        }
        resolved_max_tokens = max_tokens if max_tokens is not None else self._default_max_tokens
        if resolved_max_tokens:
            payload["max_tokens"] = resolved_max_tokens
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        return payload

    def _extract_result(self, body: dict) -> ChatResult:
        choice = (body.get("choices") or [{}])[0]
        usage = body.get("usage") or {}
        return ChatResult(
            text=(choice.get("message") or {}).get("content", "") or "",
            prompt_tokens=usage.get("prompt_tokens", 0) or 0,
            completion_tokens=usage.get("completion_tokens", 0) or 0,
            cache_hit_tokens=usage.get("prompt_cache_hit_tokens", 0) or 0,
            cache_miss_tokens=usage.get("prompt_cache_miss_tokens", 0) or 0,
            finish_reason=str(choice.get("finish_reason") or ""),
            raw=body,
        )

    def _send_with_retry(self, payload: dict) -> requests.Response:
        """POST com retry exponencial em status retryable + erros de rede."""
        url = f"{self._base_url}/chat/completions"
        last_exc: Exception | None = None
        for attempt in range(1, self._max_retries + 1):
            try:
                resp = requests.post(
                    url,
                    json=payload,
                    headers=self._headers(),
                    timeout=self._timeout,
                )
                if resp.status_code in RETRYABLE_STATUS and attempt < self._max_retries:
                    logger.warning(
                        "llm.retry status=%s attempt=%s",
                        resp.status_code,
                        attempt,
                    )
                    time.sleep(0.5 * (2 ** (attempt - 1)))
                    continue
                return resp
            except requests.exceptions.RequestException as exc:
                last_exc = exc
                logger.warning(
                    "llm.transport_error attempt=%s error=%s", attempt, exc
                )
                if attempt == self._max_retries:
                    raise LLMClientError(
                        f"falha de rede: {exc}", retryable=True
                    ) from exc
                time.sleep(0.5 * (2 ** (attempt - 1)))
        raise LLMClientError(
            f"falha de rede: {last_exc}", retryable=True
        )

    def _request(self, payload: dict) -> ChatResult:
        resp = self._send_with_retry(payload)
        if resp.status_code >= 400:
            retryable = resp.status_code in RETRYABLE_STATUS
            raise LLMClientError(
                f"HTTP {resp.status_code}: {resp.text[:300]}",
                retryable=retryable,
                status_code=resp.status_code,
                body=resp.text[:1000],
            )
        result = self._extract_result(resp.json())
        logger.info(
            "llm.chat_done model=%s prompt=%s completion=%s",
            payload["model"],
            result.prompt_tokens,
            result.completion_tokens,
        )
        return result

    # ---------- capacidades públicas ----------

    def text(
        self,
        prompt: str,
        *,
        model: str,
        system: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> ChatResult:
        """Texto natural a partir de um prompt (+ system opcional)."""
        sys_text = system or SYSTEM_PROMPT_PT
        payload = self._build_payload(
            [
                {"role": "system", "content": sys_text},
                {"role": "user", "content": prompt},
            ],
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return self._request(payload)

    def json(
        self,
        prompt: str,
        *,
        model: str,
        system: str | None = None,
        schema: dict | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> ChatResult:
        """JSON estruturado (response_format=json_object). Conteúdo vem como string."""
        sys_text = (system or SYSTEM_PROMPT_PT) + " Retorne APENAS um JSON valido."
        if schema:
            sys_text += f" Esquema esperado: {schema}."
        payload = self._build_payload(
            [
                {"role": "system", "content": sys_text},
                {"role": "user", "content": prompt},
            ],
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=True,
        )
        return self._request(payload)

    def chat(
        self,
        messages: list[dict],
        *,
        model: str,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> ChatResult:
        """Chat multi-turn cru. ``messages`` no formato OpenAI."""
        payload = self._build_payload(
            messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return self._request(payload)

    def models(self) -> list[str]:
        """GET /models — lista modelos reais do provider (valida a key de quebra)."""
        url = f"{self._base_url}/models"
        try:
            resp = requests.get(url, headers=self._headers(), timeout=self._timeout)
        except requests.exceptions.RequestException as exc:
            raise LLMClientError(
                f"falha de rede em /models: {exc}", retryable=True
            ) from exc
        if resp.status_code >= 400:
            retryable = resp.status_code in RETRYABLE_STATUS
            raise LLMClientError(
                f"HTTP {resp.status_code}: {resp.text[:200]}",
                retryable=retryable,
                status_code=resp.status_code,
                body=resp.text[:1000],
            )
        data = resp.json().get("data") or []
        return [str(m.get("id", "")) for m in data if m.get("id")]
