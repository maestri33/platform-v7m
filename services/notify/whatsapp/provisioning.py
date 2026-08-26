"""Operações administrativas na Evolution GO — criar instância e webhook.

A Evolution GO (0.7.2, herança wuzapi) é o único provedor de WhatsApp do notify.
Este módulo cuida do lado "Evolution" disso; quem amarra tudo à Account é
`notify/provisioning.py`.

Tudo aqui é idempotente: instância que já existe é reaproveitada, nunca apagada.
Deletar instância destrói a credencial da sessão e obriga novo pareamento com o
celular na mão — é o tipo de estrago que não se desfaz sozinho.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from django.conf import settings

logger = structlog.get_logger()

# Eventos que interessam ao notify: entrada de mensagem, recibos de
# entrega/leitura e histórico. (Vocabulário wuzapi, medido no GO 0.7.2 — nomes
# v2 são descartados EM SILÊNCIO no /instance/connect.)
GO_WEBHOOK_EVENTS = ["MESSAGE", "READ_RECEIPT", "HISTORY_SYNC"]


class ProvisioningError(Exception):
    pass


def webhook_url_for(instance_name: str) -> str:
    base = (getattr(settings, "EXTERNAL_URL", "") or "").rstrip("/")
    if not base:
        return ""
    return f"{base}/v1/webhook/evolution/{instance_name}"


def _client(base_url: str, api_key: str, timeout: float = 30.0) -> httpx.Client:
    if not base_url:
        raise ProvisioningError("base_url do provedor não configurada")
    return httpx.Client(
        base_url=base_url.rstrip("/"),
        headers={"apikey": api_key, "Content-Type": "application/json"},
        timeout=timeout,
    )


def _json(resp: httpx.Response) -> Any:
    try:
        return resp.json()
    except ValueError:
        return resp.text


# ── Evolution GO ────────────────────────────────────────────────────────────

def go_find_instance(instance_name: str) -> dict | None:
    with _client(
        getattr(settings, "EVOLUTION_GO_BASE_URL", ""),
        getattr(settings, "EVOLUTION_GO_ADMIN_KEY", "")
        or getattr(settings, "EVOLUTION_GO_API_KEY", ""),
    ) as c:
        resp = c.get("/instance/all")
        if resp.status_code >= 400:
            raise ProvisioningError(f"go /instance/all {resp.status_code}: {resp.text[:200]}")
        data = _json(resp)
    items = data.get("data") if isinstance(data, dict) else data
    if not isinstance(items, list):
        return None
    return next((i for i in items if isinstance(i, dict) and i.get("name") == instance_name), None)


def go_ensure_instance(*, instance_name: str) -> tuple[dict, bool]:
    """Garante a instância na GO. Devolve (instância com `token`, criada?).

    O token da instância é gerado por QUEM CRIA, não pela GO: `POST
    /instance/create` sem ele responde 400 `token is required`. É esse token que
    depois autentica os envios daquela instância — sem ele, o app cairia na key
    global e mandaria pela instância errada, que é exatamente o problema de
    "todos os apps saindo do mesmo número".
    """
    existing = go_find_instance(instance_name)
    if existing is not None:
        logger.info("provisioning.go.reused", instance=instance_name)
        return existing, False

    import uuid

    token = str(uuid.uuid4())
    with _client(
        getattr(settings, "EVOLUTION_GO_BASE_URL", ""),
        getattr(settings, "EVOLUTION_GO_ADMIN_KEY", "")
        or getattr(settings, "EVOLUTION_GO_API_KEY", ""),
    ) as c:
        resp = c.post("/instance/create", json={"name": instance_name, "token": token})
        if resp.status_code >= 400:
            raise ProvisioningError(f"go create {resp.status_code}: {resp.text[:300]}")
        data = _json(resp)

    created = data.get("data") if isinstance(data, dict) else data
    if not isinstance(created, dict):
        created = {}
    if not created.get("token"):
        # corpo enxuto: relê e, se ainda assim não vier, vale o token que ENVIAMOS
        created = go_find_instance(instance_name) or {}
        created.setdefault("token", token)
    logger.info("provisioning.go.created", instance=instance_name)
    return created, True


def go_set_webhook(instance_token: str, instance_name: str, url: str | None = None) -> Any:
    """Registra o webhook DA INSTÂNCIA (a GO faz isso no /instance/connect)."""
    url = url or webhook_url_for(instance_name)
    if not url or not instance_token:
        return None
    payload = {"webhookUrl": url, "subscribe": GO_WEBHOOK_EVENTS, "immediate": False}
    with _client(getattr(settings, "EVOLUTION_GO_BASE_URL", ""), instance_token) as c:
        resp = c.post("/instance/connect", json=payload)
        if resp.status_code >= 400:
            raise ProvisioningError(f"go connect {resp.status_code}: {resp.text[:200]}")
        return _json(resp)


def go_pairing_code(instance_token: str, phone_number: str) -> str:
    """Código de pareamento (expira ~2 min) — exige o celular do número na mão."""
    with _client(getattr(settings, "EVOLUTION_GO_BASE_URL", ""), instance_token) as c:
        resp = c.post("/instance/pair", json={"phone": phone_number})
        if resp.status_code >= 400:
            raise ProvisioningError(f"go pair {resp.status_code}: {resp.text[:200]}")
        data = _json(resp)
    if isinstance(data, dict):
        inner = data.get("data") if isinstance(data.get("data"), dict) else data
        return str(inner.get("code") or inner.get("pairingCode") or "")
    return ""
