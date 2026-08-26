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

O GO 0.7.2 fala um dialeto parecido, mas não igual (herança wuzapi/whatsmeow):
os eventos vêm como `MESSAGES.UPSERT` (o ponto some no `.replace` abaixo), como
`MESSAGE` cru (`data.Info.ID` + `data.Message`) e como `RECEIPT` — o recibo de
entrega/leitura, em lote via `MessageIDs`.

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

# Receipt do GO (whatsmeow cru): Type "" é receipt de ENTREGA, "read" é leitura,
# "read-self" é o dono lendo numa extensão — IDs de inbound não casam com
# Notification nenhuma, então promover é inofensivo.
_RECEIPT_TYPE_TO_STATUS = {
    "": "delivered",
    "read": "read",
    "read-self": "read",
    "played": "read",
}


def message_id_of(data: dict) -> str:
    """Id da mensagem, nos vários formatos que os dois provedores usam."""
    if not isinstance(data, dict):
        return ""
    key = data.get("key")
    if isinstance(key, dict) and key.get("id"):
        return str(key["id"])
    # GO às vezes entrega o whatsmeow cru: {Info: {ID: ...}, Message: {...}}
    info = data.get("Info")
    if isinstance(info, dict) and info.get("ID"):
        return str(info["ID"])
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
    if not isinstance(data, dict):
        return "", False
    key = data.get("key")
    if not isinstance(key, dict):
        key = data
    info = data.get("Info") if isinstance(data.get("Info"), dict) else {}
    jid = str(
        key.get("remoteJid") or key.get("RemoteJID") or info.get("Chat") or key.get("from") or ""
    )
    number = jid.split("@", 1)[0].split(":", 1)[0]
    from_me = bool(key.get("fromMe") or key.get("FromMe") or info.get("IsFromMe"))
    return number, from_me


def preview_of(data: dict) -> str:
    """Texto legível da mensagem recebida, qualquer que seja o tipo."""
    msg = data.get("message") if isinstance(data, dict) else None
    if not isinstance(msg, dict):
        # whatsmeow cru do GO usa "Message" com os mesmos holders dentro
        msg = data.get("Message") if isinstance(data, dict) else None
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
    return _promote_delivery(number, message_id_of(data), ack_of(data))


def _promote_delivery(number, msg_id: str, ack: str) -> str:
    from notify import outbound
    from notify.models import Notification

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


def _log_webhook(instance_name: str, payload: EvolutionWebhookIn) -> None:
    """Auditoria bruta para a página /webhook — nunca lança, nunca bloqueia.

    Falha aqui não pode derrubar o processamento do evento real: o log é
    observabilidade, não caminho crítico.
    """
    try:
        from django.conf import settings

        from notify.models import WebhookEvent

        data = payload.data or {}
        numero, _from_me = sender_of(data)
        WebhookEvent.objects.create(
            instance_name=instance_name,
            event=(payload.event or "").upper(),
            from_number=numero[:32],
            preview=preview_of(data)[:200],
            payload={"event": payload.event, "instance": payload.instance, "data": data},
        )
        max_rows = int(getattr(settings, "WEBHOOK_LOG_MAX", 500))
        vivos = list(
            WebhookEvent.objects.order_by("-id").values_list("id", flat=True)[:max_rows]
        )
        if vivos:
            WebhookEvent.objects.exclude(pk__in=vivos).delete()
    except Exception:  # noqa: BLE001
        logger.warning("notify.webhook.log_failed", instance=instance_name)


@router.post("/whatsapp/{instance_name}", auth=None)
@router.post("/evolution/{instance_name}", auth=None)
def evolution_webhook(request, instance_name: str, payload: EvolutionWebhookIn):
    """Ponto único padronizado de entrada para WhatsApp (Evolution GO / Evolution v2)."""
    from channels.models import WhatsAppNumber

    _log_webhook(instance_name, payload)

    number = WhatsAppNumber.objects.select_related("account").filter(
        instance_name=instance_name
    ).first()
    if number is None:
        logger.warning("notify.webhook.unknown_instance", instance=instance_name)
        return {"status": "ignored", "reason": "unknown_instance"}

    data = payload.data or {}
    event = (payload.event or "").upper().replace(".", "_")

    # whatsmeow cru do GO: o receipt de entrega/leitura não é um MESSAGES_UPDATE,
    # é um evento próprio com ATUALIZAÇÃO EM LOTE — MessageIDs é array.
    if event == "RECEIPT":
        ack = _RECEIPT_TYPE_TO_STATUS.get(str(data.get("Type") or "").strip().lower(), "")
        ids = data.get("MessageIDs")
        ids = ids if isinstance(ids, list) else []
        results = [_promote_delivery(number, str(mid), ack) for mid in ids]
        return {"status": "ok", "handled": "receipt", "result": results[-1] if results else "ignored"}

    if event == "MESSAGES_UPDATE":
        return {"status": "ok", "handled": "delivery", "result": _apply_delivery(number, data)}
    if event == "CONNECTION_UPDATE":
        return {"status": "ok", "handled": "connection", "result": _apply_connection(number, data)}
    if event in {"MESSAGES_UPSERT", "MESSAGES_SET", "MESSAGE", ""}:
        # Um upsert `fromMe` também carrega ACK: aproveita para promover status.
        _, from_me = sender_of(data)
        if from_me:
            return {"status": "ok", "handled": "delivery", "result": _apply_delivery(number, data)}
        return {"status": "ok", "handled": "inbound", "result": _store_inbound(number, instance_name, data)}

    return {"status": "ok", "handled": "ignored", "event": event}


# ── Stalwart Mail Server Webhook ──────────────────────────────────────────

class StalwartWebhookIn(Schema):
    event: str | None = None
    type: str | None = None
    data: dict | None = None
    queueId: str | int | None = None
    messageId: str | None = None
    sender: str | None = None
    recipient: str | None = None
    recipients: list[str] | None = None
    code: int | None = None
    details: str | None = None


def _extract_stalwart_recipient(data: dict, payload: StalwartWebhookIn) -> str:
    if payload.recipient:
        return payload.recipient.strip().lower()
    if payload.recipients and len(payload.recipients) > 0:
        return str(payload.recipients[0]).strip().lower()
    to_val = data.get("to") or data.get("recipient") or data.get("recipients")
    if isinstance(to_val, list) and to_val:
        return str(to_val[0]).strip().lower()
    if isinstance(to_val, str):
        return to_val.strip().lower()
    return ""


@router.post("/stalwart", auth=None)
@router.post("/email", auth=None)
def stalwart_webhook(request, payload: StalwartWebhookIn):
    """Receptor de eventos do Stalwart Mail Server (entregas, bounces e recebimento)."""
    from channels.models import MailIdentity, SuppressedEmail
    from notify import outbound
    from notify.models import InboundEvent, Notification, WebhookEvent

    event_name = (payload.event or payload.type or "").lower().strip()
    data = payload.data or {}
    msg_id = str(payload.messageId or data.get("messageId") or data.get("message_id") or "").strip("<> ")
    recipient = _extract_stalwart_recipient(data, payload)
    sender = str(payload.sender or data.get("from") or data.get("sender") or "").strip().lower()
    details = str(payload.details or data.get("details") or data.get("error") or "")

    # Auditoria bruta
    try:
        WebhookEvent.objects.create(
            instance_name="stalwart",
            event=event_name.upper() or "STALWART_EVENT",
            from_number=sender[:32],
            preview=f"{event_name}: {recipient} ({details})"[:200],
            payload={"event": event_name, "msg_id": msg_id, "recipient": recipient, "sender": sender, "data": data},
        )
    except Exception:  # noqa: BLE001
        logger.warning("notify.webhook.stalwart_log_failed")

    # 1. Casamento com Notification enviada
    notif = None
    if msg_id:
        notif = Notification.objects.filter(provider_message_id=msg_id).first()
    if notif is None and recipient:
        notif = (
            Notification.objects.filter(recipient_email__iexact=recipient, want_email=True)
            .order_by("-created_at")
            .first()
        )

    # 2. Confirmação de Entrega (Delivered)
    if any(k in event_name for k in ("delivery.delivered", "delivered", "dsn-success", "dsn.success")):
        if notif:
            notif.delivery_status = "delivered"
            if notif.delivered_at is None:
                notif.delivered_at = timezone.now()
            notif.save(update_fields=["delivery_status", "delivered_at"])
            outbound.push_status(notif, stage="delivery")
            logger.info("notify.email_delivered", external_id=str(notif.external_id), recipient=recipient)
            return {"status": "ok", "handled": "delivered", "external_id": str(notif.external_id)}
        return {"status": "ok", "handled": "delivered_unmatched", "recipient": recipient}

    # 3. Falha Definitiva / Bounce (Failed / Expired)
    if any(k in event_name for k in ("delivery.failed", "delivery.expired", "bounce", "dsn-failure", "dsn.failure")):
        err_msg = details or "Entrega de e-mail rejeitada ou expirada pelo servidor remoto"
        if notif:
            notif.email_status = "failed"
            notif.email_error = err_msg[:300]
            notif.save(update_fields=["email_status", "email_error"])
            outbound.push_status(notif, stage="email")
            if recipient:
                SuppressedEmail.objects.get_or_create(
                    account=notif.account,
                    email=recipient,
                    defaults={"reason": f"Stalwart bounce: {err_msg[:250]}"},
                )
            logger.warning("notify.email_bounced", external_id=str(notif.external_id), recipient=recipient, error=err_msg)
            return {"status": "ok", "handled": "bounced", "external_id": str(notif.external_id)}
        return {"status": "ok", "handled": "bounced_unmatched", "recipient": recipient}

    # 4. Mensagem de E-mail Recebida (Inbound)
    if any(k in event_name for k in ("message-received", "message.received", "inbound")):
        account = None
        if sender:
            ident = MailIdentity.objects.filter(from_email__iexact=sender).select_related("account").first()
            if ident:
                account = ident.account
        if account:
            event = InboundEvent.objects.create(
                account=account,
                instance_name="stalwart",
                from_number=sender[:32],
                preview=details[:200] or f"E-mail recebido de {sender}",
                payload={"event": event_name, "recipient": recipient, "sender": sender, "data": data},
            )
            outbound.push_inbound(event)
            return {"status": "ok", "handled": "inbound", "event_id": event.id}

    return {"status": "ok", "handled": "ignored", "event": event_name}

