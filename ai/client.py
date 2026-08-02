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
    # User-Agent próprio é OBRIGATÓRIO: o gateway aplica tarpit ao UA default
    # "python-httpx" (medido em 2026-08-02 — a raiz respondia 0.04s pro curl e
    # pendurava pro httpx; com UA identificado, /v1/models voltou a responder
    # em 0.02s). Era a causa raiz dos "OmniRouter não responde" históricos.
    headers = {"Content-Type": "application/json", "User-Agent": "notify-server/1.0"}
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
    """Estado do gateway, para o dashboard dizer a verdade sobre a IA.

    Medição de 2026-08-02, da LXC de produção: `/v1/models` estoura timeout
    com o gateway VIVO, e o chat oscila entre 8s e 22s (auto/fast) — nenhum
    dos dois serve de "ping" de painel. Já a raiz `/` responde 307 em <0.2s.
    Por isso: models com timeout curto (dá a contagem quando colabora) e, se
    travar, a raiz decide se o gateway está de pé. Chat/TTS reais continuam
    sendo exercitados pelos botões de teste, que é onde a demora é aceitável.
    """
    base = _base_url()
    if not base:
        return {"ok": False, "detail": "OMNIROUTER_URL não configurada"}
    # Quem decide vivo/morto é a RAIZ (responde em <0.2s). O catálogo
    # /v1/models tem ~5k modelos e o download costuma estourar qualquer
    # timeout razoável — 200 no header e ReadTimeout no body (medido em
    # produção); abortá-lo ainda penaliza o request seguinte. Então ele é
    # best-effort: enfeita a contagem quando colaborar, nunca derruba o ok.
    try:
        resp = httpx.get(base + "/", headers=_headers(), timeout=5.0)
        if resp.status_code >= 500:
            return {"ok": False, "detail": f"HTTP {resp.status_code}"}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "detail": f"{type(exc).__name__}"}

    out = {"ok": True, "models": 0, "detail": "gateway de pé", "url": base}
    try:
        resp = httpx.get(f"{base}/v1/models", headers=_headers(), timeout=4.0)
        if resp.status_code < 400:
            out["models"] = len((resp.json() or {}).get("data") or [])
            out["detail"] = ""
    except Exception:  # noqa: BLE001 — catálogo lento não é gateway morto
        out["detail"] = "gateway de pé (catálogo /v1/models lento — conhecido)"
    return out
