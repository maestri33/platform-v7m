"""Cliente de chat do OmniRouter — a parte "AI-first" do notify.

Regra que atravessa este módulo: **IA nunca entra no caminho da entrega.** Ela
escreve e reescreve teor (template de e-mail, corpo de mensagem, assunto) a
pedido de um humano ou de um agente no dashboard. Se o modelo estiver fora, uma
notificação continua saindo normalmente — só a sugestão não aparece.

Por isso o timeout é explícito e o erro é falado: em 2026-07-28 o
`/v1/chat/completions` do OmniRouter aceitava o request e não respondia.
Um cliente que travasse esperando levaria o worker junto.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from django.conf import settings

logger = structlog.get_logger()

DEFAULT_MODEL = "auto/best-fast"
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
        msg = data["choices"][0]["message"]
        text = msg.get("content") or msg.get("reasoning_content") or ""
    except Exception as exc:  # noqa: BLE001
        raise AiError(f"resposta inesperada do OmniRouter: {resp.text[:200]}") from exc

    logger.info("ai.completed", model=payload["model"], chars=len(text or ""))
    return (text or "").strip()


def transcribe(
    audio_bytes: bytes,
    *,
    filename: str = "audio.mp3",
    model: str | None = None,
    timeout: float | None = None,
) -> str:
    """Transcreve áudio (Voz para Texto) via OmniRouter (/v1/audio/transcriptions).

    Devolve o texto transcrito ou levanta AiError/AiUnavailable.
    """
    base = _base_url()
    if not base:
        raise AiError("OMNIROUTER_URL não configurada")

    headers = {}
    key = getattr(settings, "OMNIROUTER_API_KEY", "")
    if key:
        headers["Authorization"] = f"Bearer {key}"
    headers["User-Agent"] = "notify-server/1.0"

    m_type = "audio/mpeg"
    if filename.endswith(".ogg") or filename.endswith(".opus"):
        m_type = "audio/ogg"
    elif filename.endswith(".wav"):
        m_type = "audio/wav"
    elif filename.endswith(".m4a") or filename.endswith(".aac"):
        m_type = "audio/mp4"

    files = {"file": (filename, audio_bytes, m_type)}
    data = {"model": model or getattr(settings, "AI_STT_MODEL", "whisper-1")}
    seconds = timeout or float(getattr(settings, "AI_TIMEOUT_S", DEFAULT_TIMEOUT_S))

    try:
        resp = httpx.post(
            f"{base}/v1/audio/transcriptions",
            files=files,
            data=data,
            headers=headers,
            timeout=seconds,
        )
    except httpx.TimeoutException as exc:
        logger.warning("ai.stt.timeout", seconds=seconds)
        raise AiUnavailable(
            f"OmniRouter não respondeu em {seconds:.0f}s — transcrição indisponível"
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise AiUnavailable(f"OmniRouter inacessível: {type(exc).__name__}") from exc

    if resp.status_code >= 400:
        raise AiError(f"OmniRouter {resp.status_code}: {resp.text[:200]}", resp.status_code)

    try:
        data_resp = resp.json()
        text = data_resp.get("text", "")
    except Exception as exc:  # noqa: BLE001
        raise AiError(f"resposta inesperada do OmniRouter STT: {resp.text[:200]}") from exc

    logger.info("ai.transcribed", model=data["model"], chars=len(text or ""))
    return (text or "").strip()


def health() -> dict:
    """Estado do gateway, para o dashboard dizer a verdade sobre a IA."""
    base = _base_url()
    if not base:
        return {"ok": False, "detail": "OMNIROUTER_URL não configurada"}
    try:
        resp = httpx.get(base + "/", headers=_headers(), timeout=1.0)
        if resp.status_code >= 500:
            return {"ok": False, "detail": f"HTTP {resp.status_code}"}
        return {"ok": True, "models": 0, "detail": "gateway de pé", "url": base}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "detail": f"{type(exc).__name__}"}


def probe_chat_completions(
    url: str = "http://10.0.1.35/v1/chat/completions",
    api_key: str = "sk-d3786a77f7a483da-d7292e-5e7de527",
    model: str = "default",
) -> dict[str, Any]:
    """Testa e valida o endpoint de IA (OmniRouter / LLM) com o payload padrão."""
    import json
    import urllib.request

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "notify-server/1.0",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model or "default",
        "messages": [
            {"role": "system", "content": "Você é um arquiteto de software."},
            {"role": "user", "content": "Qual a vantagem de usar o combo default do OmniRoute?"},
        ],
        "max_tokens": 150,
    }

    try:
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode("utf-8"), headers=headers
        )
        with urllib.request.urlopen(req, timeout=45.0) as response:
            res = json.loads(response.read().decode("utf-8"))
            used_model = res.get("model", model)
            content = res["choices"][0]["message"]["content"]
            return {"ok": True, "model": used_model, "content": content}
    except Exception as exc:
        logger.warning("ai.probe_failed", url=url, error=str(exc))
        return {"ok": False, "error": str(exc)}


def generate_image(
    prompt: str,
    *,
    base_url: str = "http://10.0.1.35",
    api_key: str = "sk-d3786a77f7a483da-d7292e-5e7de527",
    model: str = "aihorde/stable_diffusion",
    size: str = "512x512",
    timeout: float = 60.0,
) -> bytes:
    """Gera imagem/logo via IA (/v1/images/generations). Retorna os bytes da imagem."""
    import base64

    endpoint = f"{base_url.rstrip('/')}/v1/images/generations"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "notify-server/1.0",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model,
        "prompt": prompt,
        "n": 1,
        "size": size,
    }

    resp = httpx.post(endpoint, json=payload, headers=headers, timeout=timeout)
    if resp.status_code >= 400:
        raise AiError(f"Erro ao gerar imagem: {resp.status_code} {resp.text[:200]}")

    data = resp.json()
    items = data.get("data") or []
    if not items:
        raise AiError("Nenhuma imagem retornada pela IA.")

    first = items[0]
    if "b64_json" in first:
        return base64.b64decode(first["b64_json"])
    if "url" in first:
        img_url = first["url"]
        img_resp = httpx.get(img_url, timeout=30.0)
        return img_resp.content

    raise AiError("Formato de imagem desconhecido retornado pela IA.")


def propose_mail_template(
    app_name: str,
    accent_color: str = "#4f7cff",
    logo_url: str = "",
) -> str:
    """Gera uma proposta de template HTML responsivo e elegante para o app."""
    logo_html = ""
    if logo_url:
        logo_html = f'<img src="{logo_url}" alt="{app_name}" style="max-height:42px;margin-bottom:16px;border-radius:6px;">'

    template = f"""<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{{{title}}}}</title>
  <style>
    body {{ margin:0; padding:0; background-color:#090d16; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#f8fafc; }}
    .wrapper {{ width:100%; max-width:580px; margin:32px auto; background:#0f172a; border-radius:12px; border:1px solid rgba(255,255,255,0.08); overflow:hidden; }}
    .header {{ padding:28px 32px 20px; background:#0c1220; border-bottom:1px solid rgba(255,255,255,0.06); text-align:center; }}
    .brand-title {{ font-size:20px; font-weight:700; color:{accent_color}; margin:0; letter-spacing:-0.5px; }}
    .body {{ padding:32px; font-size:14.5px; line-height:1.6; color:#e2e8f0; }}
    .body a {{ color:{accent_color}; text-decoration:none; font-weight:600; }}
    .footer {{ padding:20px 32px; background:#0c1220; border-top:1px solid rgba(255,255,255,0.06); text-align:center; font-size:11.5px; color:#64748b; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      {logo_html}
      <h1 class="brand-title">{{{{service_name}}}}</h1>
    </div>
    <div class="body">
      {{{{content}}}}
    </div>
    <div class="footer">
      Esta é uma mensagem automática enviada por {app_name}.<br>
      Não responda diretamente a este e-mail.
    </div>
  </div>
</body>
</html>"""
    return template
