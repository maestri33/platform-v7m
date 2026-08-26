"""Adaptação de conteúdo por canal no pipeline de envio — FAIL-OPEN.

O app é IA-first: o conteúdo que chega pode ser adaptado por canal antes do
despacho (WhatsApp mais direto, e-mail mais formal + sugestão de assunto). MAS a
regra antiga do módulo `ai/` continua valendo por baixo: **a entrega nunca
depende do modelo**. Aqui ela vira fail-open explícito:

- timeout próprio e curto (`AI_ADAPT_TIMEOUT_S`, default 8s) — nada de esperar
  os 90s do assistente de dashboard dentro do worker;
- qualquer falha (gateway fora, JSON inválido, resposta vazia) devolve o
  conteúdo ORIGINAL e o envio segue como se a IA não existisse;
- liga/desliga por conta (`Account.ai_adapt`) e globalmente
  (`AI_ADAPT_ENABLED`); `TEST_MODE` nunca chama rede.

A adaptação PRESERVA placeholders `{chave}` e não inventa fatos — as regras do
prompt são rígidas e a saída é validada antes de substituir o original.
"""

from __future__ import annotations

import json

import structlog
from django.conf import settings

from ai.client import AiError, complete

logger = structlog.get_logger()

_SYSTEM = """Você adapta UMA mensagem transacional para os canais pedidos.
Responda APENAS com JSON válido, sem markdown, no formato:
{"whatsapp": "...", "email": "...", "subject": "..."}
Regras rígidas:
- NÃO invente informação; preserve todos os fatos, valores, links e placeholders {chave} exatamente como estão.
- "whatsapp": a mesma mensagem, direta e curta; markdown leve (*negrito*) permitido.
- "email": a mesma mensagem, tom cordial de e-mail transacional; markdown simples.
- "subject": assunto de e-mail com no máximo 60 caracteres, sem emoji.
- Se um canal não estiver na lista pedida, devolva "" nele.
- Português do Brasil."""


def enabled_for(account) -> bool:
    if getattr(settings, "TEST_MODE", False):
        return False
    if not getattr(settings, "AI_ADAPT_ENABLED", True):
        return False
    return bool(getattr(account, "ai_adapt", False))


def _parse(raw: str) -> dict | None:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    try:
        data = json.loads(text)
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def _placeholders_ok(original: str, adapted: str) -> bool:
    """Adaptação que perde um placeholder {chave} é descartada."""
    import re

    orig = set(re.findall(r"\{[a-zA-Z0-9_.-]+\}", original or ""))
    got = set(re.findall(r"\{[a-zA-Z0-9_.-]+\}", adapted or ""))
    return orig.issubset(got)


def adapt(text: str, *, channels: list[str], title: str = "") -> dict:
    """Adapta `text` por canal. SEMPRE devolve dict utilizável (fail-open).

    Retorno: {"whatsapp": str, "email": str, "subject": str, "adapted": bool}
    — com o texto original nos canais quando a IA não puder ajudar.
    """
    fallback = {"whatsapp": text, "email": text, "subject": "", "adapted": False}
    pedido = [c for c in channels if c in ("whatsapp", "email")]
    if not text or not pedido:
        return fallback

    prompt = (
        f"Canais: {', '.join(pedido)}.\n"
        + (f"Título/contexto: {title}\n" if title else "")
        + f"Mensagem original:\n{text}"
    )
    timeout = float(getattr(settings, "AI_ADAPT_TIMEOUT_S", 8.0))
    try:
        raw = complete(
            prompt,
            system=_SYSTEM,
            temperature=0.3,
            max_tokens=1200,
            timeout=timeout,
            model=getattr(settings, "AI_ADAPT_MODEL", "") or None,
        )
    except AiError as exc:
        logger.warning("ai.adapt.indisponivel", error=str(exc)[:160])
        return fallback
    except Exception as exc:  # noqa: BLE001 — fail-open é a regra deste módulo
        logger.warning("ai.adapt.erro", error=f"{type(exc).__name__}: {exc}"[:160])
        return fallback

    data = _parse(raw)
    if data is None:
        logger.warning("ai.adapt.json_invalido", preview=raw[:120])
        return fallback

    out = dict(fallback)
    wa = str(data.get("whatsapp") or "").strip()
    mail = str(data.get("email") or "").strip()
    subject = str(data.get("subject") or "").strip()[:120]

    if "whatsapp" in pedido and wa and _placeholders_ok(text, wa):
        out["whatsapp"] = wa
        out["adapted"] = True
    if "email" in pedido and mail and _placeholders_ok(text, mail):
        out["email"] = mail
        out["adapted"] = True
    if subject:
        out["subject"] = subject

    if out["adapted"]:
        logger.info("ai.adapt.ok", channels=pedido, subject=bool(subject))
    return out
