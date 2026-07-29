"""Cliente de chat do OmniRouter — a parte "AI-first" do notify.

Regra que atravessa este módulo: **IA nunca entra no caminho da entrega.** Ela
escreve e reescreve teor (template de e-mail, corpo de mensagem, assunto) a
pedido de um humano ou de um agente no dashboard. Se o modelo estiver fora, uma
notificação continua saindo normalmente — só a sugestão não aparece.

Por isso o timeout é explícito e o erro é falado: em 2026-07-28 o
`/v1/chat/completions` do OmniRouter aceitava o request e não respondia (o
`/v1/audio/speech`, usado pelo TTS, respondia normalmente). Um cliente que
travasse esperando levaria o worker junto.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from django.conf import settings

logger = structlog.get_logger()

DEFAULT_MODEL = "auto/fast"
DEFAULT_TIMEOUT_S = 90.0


class AiError(Exception):
    def __init__(self, message: str, status_code: int = 0):
        self.status_code = status_code
        super().__init__(message)


class AiUnavailable(AiError):
    """Gateway não respondeu no tempo — sugestão indisponível, serviço intacto."""


def _base_url() -> str:
    return (getattr(settings, "OMNIROUTER_URL", "") or "").rstrip("/")


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    key = getattr(settings, "OMNIROUTER_API_KEY", "")
    if key:
        headers["Authorization"] = f"Bearer {key}"
    return headers


def complete(
    prompt: str,
    *,
    system: str = "",
    model: str | None = None,
    temperature: float = 0.4,
    max_tokens: int = 1800,
    timeout: float | None = None,
) -> str:
    """Uma volta de chat. Devolve o texto ou levanta AiError/AiUnavailable."""
    base = _base_url()
    if not base:
        raise AiError("OMNIROUTER_URL não configurada")

    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload: dict[str, Any] = {
        "model": model or getattr(settings, "AI_MODEL", DEFAULT_MODEL),
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    seconds = timeout or float(getattr(settings, "AI_TIMEOUT_S", DEFAULT_TIMEOUT_S))

    try:
        resp = httpx.post(
            f"{base}/v1/chat/completions", json=payload, headers=_headers(), timeout=seconds
        )
    except httpx.TimeoutException as exc:
        logger.warning("ai.timeout", seconds=seconds)
        raise AiUnavailable(
            f"OmniRouter não respondeu em {seconds:.0f}s — sugestão indisponível"
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise AiUnavailable(f"OmniRouter inacessível: {type(exc).__name__}") from exc

    if resp.status_code >= 400:
        raise AiError(f"OmniRouter {resp.status_code}: {resp.text[:200]}", resp.status_code)

    try:
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
    except Exception as exc:  # noqa: BLE001
        raise AiError(f"resposta inesperada do OmniRouter: {resp.text[:200]}") from exc

    logger.info("ai.completed", model=payload["model"], chars=len(text or ""))
    return (text or "").strip()


def health() -> dict:
    """Estado do gateway, para o dashboard dizer a verdade sobre a IA."""
    base = _base_url()
    if not base:
        return {"ok": False, "detail": "OMNIROUTER_URL não configurada"}
    try:
        resp = httpx.get(f"{base}/v1/models", headers=_headers(), timeout=10.0)
        if resp.status_code >= 400:
            return {"ok": False, "detail": f"HTTP {resp.status_code}"}
        models = (resp.json() or {}).get("data") or []
        return {"ok": True, "models": len(models), "url": base}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "detail": f"{type(exc).__name__}"}
