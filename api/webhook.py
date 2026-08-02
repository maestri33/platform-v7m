"""Webhook da Evolution — inbound, status de entrega e estado da conexão.

Antes daqui só saía uma coisa: gravar o payload bruto num `InboundEvent`. Isso
deixava dois buracos. Primeiro, `sent` era o fim da linha — o notify nunca sabia
se a mensagem foi entregue ou lida, embora a Evolution avise. Segundo, mensagem
que chegava no número da conta morria no banco, sem ninguém para contar.

Agora o webhook faz três coisas, cada uma com seu tipo de evento:

- `MESSAGES_UPDATE` → casa `key.id` com `Notification.provider_message_id` e
  promove o estado de entrega (sent → delivered → read). Só promove: um ACK
  atrasado não pode rebaixar uma mensagem já lida.
- `MESSAGES_UPSERT` com `fromMe:false` → grava o recebido e empurra para o
  webhook do app.
- `CONNECTION_UPDATE` → atualiza `connection_status` do número, que é o que o
  dashboard mostra.

Continua sem auth: quem chama é a Evolution, na mesma rede privada, e exigir
credencial aqui só criaria mais uma chave para girar. Instância desconhecida é
aceita e ignorada — devolver erro faria a Evolution reenviar para sempre.
"""

from __future__ import annotations

import structlog
from django.utils import timezone
from ninja import Router, Schema

logger = structlog.get_logger()
router = Router(tags=["webhook"])

# Ordem de progresso da entrega. Índice maior nunca é sobrescrito por menor.
_DELIVERY_RANK = {"": 0, "sent": 1, "delivered": 2, "read": 3}

_ACK_TO_STATUS = {
    "PENDING": "sent",
    "SERVER_ACK": "sent",
    "DELIVERY_ACK": "delivered",
    "READ": "read",
    "PLAYED": "read",
    # Evolution GO / Baileys numérico
    "1": "sent",
    "2": "delivered",
    "3": "read",
    "4": "read",
}

_OPEN_STATES = {"open", "connected", "online"}


def message_id_of(data: dict) -> str:
    """Id da mensagem, nos vários formatos que os dois provedores usam."""
    if not isinstance(data, dict):
        return ""
    key = data.get("key")
    if isinstance(key, dict) and key.get("id"):
        return str(key["id"])
    for field in ("keyId", "messageId", "id", "Id", "ID"):
        if data.get(field):
            return str(data[field])
    return ""


def ack_of(data: dict) -> str:
    """Estado de entrega normalizado ('sent'|'delivered'|'read') ou ''."""
    if not isinstance(data, dict):
        return ""
    raw = data.get("status")
    update = data.get("update")
    if isinstance(update, dict) and update.get("status") is not None:
        raw = update.get("status")
    if raw is None:
        raw = data.get("ack") or data.get("Ack")
    if raw is None:
        return ""
    return _ACK_TO_STATUS.get(str(raw).upper().strip(), "")


def sender_of(data: dict) -> tuple[str, bool]:
    """(número do remetente sem sufixo JID, veio de nós?)."""
    key = data.get("key") if isinstance(data, dict) else None
    if not isinstance(key, dict):
        key = data if isinstance(data, dict) else {}
    jid = str(key.get("remoteJid") or key.get("RemoteJID") or key.get("from") or "")
    number = jid.split("@", 1)[0].split(":", 1)[0]
    from_me = bool(key.get("fromMe") or key.get("FromMe"))
    return number, from_me


def preview_of(data: dict) -> str:
    """Texto legível da mensagem recebida, qualquer que seja o tipo."""
    msg = data.get("message") if isinstance(data, dict) else None
    if not isinstance(msg, dict):
        return str(data.get("text") or data.get("body") or "")[:280]
    if msg.get("conversation"):
        return str(msg["conversation"])[:280]
    for holder, field in (
        ("extendedTextMessage", "text"),
        ("imageMessage", "caption"),
        ("videoMessage", "caption"),
        ("documentMessage", "fileName"),
        ("buttonsResponseMessage", "selectedDisplayText"),
        ("listResponseMessage", "title"),
    ):
        inner = msg.get(holder)
        if isinstance(inner, dict) and inner.get(field):
            return str(inner[field])[:280]
    if "audioMessage" in msg:
        return "[áudio]"
    if "stickerMessage" in msg:
        return "[figurinha]"
    if "locationMessage" in msg:
        return "[localização]"
    return "[mensagem sem texto]"


class EvolutionWebhookIn(Schema):
    event: str | None = None
    instance: str | None = None
    data: dict | None = None


def _apply_delivery(number, data: dict) -> str:
    """Promove o estado de entrega da Notification correspondente."""
    from notify import outbound
    from notify.models import Notification

    msg_id = message_id_of(data)
    ack = ack_of(data)
    if not msg_id or not ack:
        return "ignored"

    notif = Notification.objects.filter(
        account=number.account, provider_message_id=msg_id
    ).first()
    if notif is None:
        return "unknown_message"

    if _DELIVERY_RANK.get(ack, 0) <= _DELIVERY_RANK.get(notif.delivery_status or "", 0):
        return "stale"

    notif.delivery_status = ack
    fields = ["delivery_status"]
    if ack == "delivered" and notif.delivered_at is None:
        notif.delivered_at = timezone.now()
        fields.append("delivered_at")
    if ack == "read":
        if notif.delivered_at is None:
            notif.delivered_at = timezone.now()
            fields.append("delivered_at")
        if notif.read_at is None:
            notif.read_at = timezone.now()
            fields.append("read_at")
    notif.save(update_fields=fields)
    outbound.push_status(notif, stage="delivery")
    logger.info("notify.delivery_update", external_id=str(notif.external_id), status=ack)
    return ack


def _store_inbound(number, instance_name: str, data: dict) -> str:
    from notify import outbound
    from notify.models import InboundEvent

    from_number, from_me = sender_of(data)
    if from_me:
        return "own_message"

    msg_id = message_id_of(data) or f"no-id-{timezone.now().timestamp()}"
    event, created = InboundEvent.objects.get_or_create(
        wa_message_id=msg_id,
        defaults={
            "account": number.account,
            "instance_name": instance_name,
            "payload": data,
            "from_number": from_number,
            "preview": preview_of(data),
        },
    )
    if not created:
        return "duplicate"
    outbound.push_inbound(event)
    from channels.models import AppWebhook

    if AppWebhook.objects.filter(account=number.account, active=True).exists():
        event.forwarded = True
        event.save(update_fields=["forwarded"])
    return "stored"


def _apply_connection(number, data: dict) -> str:
    state = str(data.get("state") or data.get("status") or data.get("connection") or "").lower()
    if not state:
        return "ignored"
    number.connection_status = "open" if state in _OPEN_STATES else state
    number.status_checked_at = timezone.now()
    number.save(update_fields=["connection_status", "status_checked_at"])
    return number.connection_status


@router.post("/evolution/{instance_name}", auth=None)
def evolution_webhook(request, instance_name: str, payload: EvolutionWebhookIn):
    """Ponto único de entrada dos dois provedores (v2 e GO)."""
    from channels.models import WhatsAppNumber

    number = WhatsAppNumber.objects.select_related("account").filter(
        instance_name=instance_name
    ).first()
    if number is None:
        logger.warning("notify.webhook.unknown_instance", instance=instance_name)
        return {"status": "ignored", "reason": "unknown_instance"}

    data = payload.data or {}
    event = (payload.event or "").upper().replace(".", "_")

    if event == "MESSAGES_UPDATE":
        return {"status": "ok", "handled": "delivery", "result": _apply_delivery(number, data)}
    if event == "CONNECTION_UPDATE":
        return {"status": "ok", "handled": "connection", "result": _apply_connection(number, data)}
    if event in {"MESSAGES_UPSERT", "MESSAGES_SET", ""}:
        # Um upsert `fromMe` também carrega ACK: aproveita para promover status.
        _, from_me = sender_of(data)
        if from_me:
            return {"status": "ok", "handled": "delivery", "result": _apply_delivery(number, data)}
        return {"status": "ok", "handled": "inbound", "result": _store_inbound(number, instance_name, data)}

    return {"status": "ok", "handled": "ignored", "event": event}
