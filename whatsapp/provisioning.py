"""Operações administrativas nas duas Evolutions — criar instância e webhook.

A regra da casa é que o MESMO número tenha instância nos dois provedores: a v2
como base e a GO como fallback / funções extras. Este módulo cuida do lado
"Evolution" disso; quem amarra tudo à Account é `notify/provisioning.py`.

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

# Eventos que interessam ao notify: entrada de mensagem, mudança de status de
# entrega e queda/volta de conexão.
V2_WEBHOOK_EVENTS = [
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "SEND_MESSAGE",
    "CONNECTION_UPDATE",
]
GO_WEBHOOK_EVENTS = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"]


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


# ── Evolution v2 ────────────────────────────────────────────────────────────

def v2_find_instance(instance_name: str) -> dict | None:
    with _client(
        getattr(settings, "WHATSAPP_API_BASE_URL", ""),
        getattr(settings, "WHATSAPP_GLOBAL_API_KEY", ""),
    ) as c:
        resp = c.get("/instance/fetchInstances")
        if resp.status_code >= 400:
            raise ProvisioningError(f"v2 fetchInstances {resp.status_code}: {resp.text[:200]}")
        data = _json(resp)
    if not isinstance(data, list):
        return None
    for item in data:
        if not isinstance(item, dict):
            continue
        name = item.get("name") or (item.get("instance") or {}).get("instanceName")
        if name == instance_name:
            return item
    return None


def v2_ensure_instance(*, instance_name: str, phone_number: str = "") -> tuple[dict, bool]:
    """Garante a instância na v2. Devolve (instância, criada?)."""
    existing = v2_find_instance(instance_name)
    if existing is not None:
        logger.info("provisioning.v2.reused", instance=instance_name)
        return existing, False

    payload: dict[str, Any] = {
        "instanceName": instance_name,
        "integration": "WHATSAPP-BAILEYS",
        "qrcode": False,  # pareamento é ato humano, não do provisionamento
        "groupsIgnore": True,
        "alwaysOnline": False,
        "readMessages": False,
        "syncFullHistory": False,
    }
    if phone_number:
        payload["number"] = phone_number
    hook = webhook_url_for(instance_name)
    if hook:
        payload["webhook"] = {"url": hook, "byEvents": False, "events": V2_WEBHOOK_EVENTS}

    with _client(
        getattr(settings, "WHATSAPP_API_BASE_URL", ""),
        getattr(settings, "WHATSAPP_GLOBAL_API_KEY", ""),
    ) as c:
        resp = c.post("/instance/create", json=payload)
        if resp.status_code == 403 and "already in use" in resp.text:
            # corrida com outro provisionamento — trata como reaproveitamento
            return (v2_find_instance(instance_name) or {}), False
        if resp.status_code >= 400:
            raise ProvisioningError(f"v2 create {resp.status_code}: {resp.text[:300]}")
        created = _json(resp)

    logger.info("provisioning.v2.created", instance=instance_name)
    return (created if isinstance(created, dict) else {}), True


def v2_set_webhook(instance_name: str, url: str | None = None) -> Any:
    url = url or webhook_url_for(instance_name)
    if not url:
        return None
    payload = {"webhook": {"enabled": True, "url": url, "byEvents": False, "events": V2_WEBHOOK_EVENTS}}
    with _client(
        getattr(settings, "WHATSAPP_API_BASE_URL", ""),
        getattr(settings, "WHATSAPP_GLOBAL_API_KEY", ""),
    ) as c:
        resp = c.post(f"/webhook/set/{instance_name}", json=payload)
        if resp.status_code >= 400:
            raise ProvisioningError(f"v2 webhook/set {resp.status_code}: {resp.text[:200]}")
        return _json(resp)


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
