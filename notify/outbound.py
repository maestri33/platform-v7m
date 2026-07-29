"""Devolução de eventos para o webhook do app (status e mensagens recebidas).

O notify é relay: ele não guarda conversa, ele conta o que aconteceu. Quem
precisa do histórico é o app, e o caminho é este — um POST assinado para a URL
que a conta cadastrou.

Duas decisões:

1. **Falha levanta exceção de propósito.** A entrega roda na Django-Q; deixar a
   exceção subir é o que faz o cluster reagendar. Engolir o erro daria um log
   bonito e um app desatualizado.

2. **Assinatura é opcional.** Dentro da VPN, exigir segredo em todo app só
   atrasa a integração. Se a conta preencher `secret`, assinamos em HMAC-SHA256;
   se não, mandamos limpo.
"""

from __future__ import annotations

import hashlib
import hmac
import json

import httpx
import structlog
from django.utils import timezone

logger = structlog.get_logger()

TIMEOUT_S = 10.0


def _sign(secret: str, body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def deliver(account_id: int, event: str, payload: dict) -> None:
    """Task da Django-Q: entrega UM evento ao webhook da conta."""
    from channels.models import AppWebhook

    hook = AppWebhook.objects.filter(account_id=account_id).first()
    if hook is None or not hook.wants(event):
        return

    body = json.dumps({"event": event, "data": payload}, ensure_ascii=False).encode()
    headers = {
        "Content-Type": "application/json",
        "X-Notify-Event": event,
        "X-Notify-Account": hook.account.slug,
    }
    if hook.secret:
        headers["X-Notify-Signature"] = _sign(hook.secret, body)

    hook.last_delivery_at = timezone.now()
    try:
        resp = httpx.post(hook.url, content=body, headers=headers, timeout=TIMEOUT_S)
    except Exception as exc:  # noqa: BLE001
        hook.last_status = None
        hook.last_error = f"{type(exc).__name__}: {exc}"[:300]
        hook.save(update_fields=["last_status", "last_error", "last_delivery_at"])
        logger.warning("notify.webhook.transport_error", account_id=account_id, evento=event)
        raise

    hook.last_status = resp.status_code
    hook.last_error = "" if resp.status_code < 400 else resp.text[:300]
    hook.save(update_fields=["last_status", "last_error", "last_delivery_at"])

    if resp.status_code >= 400:
        logger.warning(
            "notify.webhook.rejected", account_id=account_id, evento=event, status=resp.status_code
        )
        raise RuntimeError(f"webhook do app respondeu {resp.status_code}")
    logger.info("notify.webhook.delivered", account_id=account_id, evento=event)


def _enqueue(account_id: int, event: str, payload: dict) -> None:
    from channels.models import AppWebhook

    if not AppWebhook.objects.filter(account_id=account_id, active=True).exists():
        return
    try:
        from django_q.tasks import async_task

        async_task("notify.outbound.deliver", account_id, event, payload)
    except Exception:  # noqa: BLE001 — sem cluster (dev/test): entrega na hora
        try:
            deliver(account_id, event, payload)
        except Exception:  # noqa: BLE001
            pass


def status_payload(notif) -> dict:
    return {
        "external_id": str(notif.external_id),
        "idempotency_key": notif.idempotency_key,
        "caller": notif.caller,
        "recipient_phone": notif.recipient_phone,
        "recipient_email": notif.recipient_email,
        "whatsapp_status": notif.whatsapp_status,
        "email_status": notif.email_status,
        "tts_status": notif.tts_status,
        "sms_status": notif.sms_status,
        "delivery_status": notif.delivery_status or None,
        "provider_message_id": notif.provider_message_id,
        "driver_used": notif.driver_used or None,
        "attempts": notif.attempts,
        "whatsapp_error": notif.whatsapp_error,
        "email_error": notif.email_error,
        "tts_error": notif.tts_error,
        "updated_at": timezone.now().isoformat(),
    }


def push_status(notif) -> None:
    """Chame depois de mudar o estado de entrega de uma Notification."""
    _enqueue(notif.account_id, "status", status_payload(notif))


def push_inbound(event) -> None:
    """Chame quando chegar mensagem no número da conta."""
    _enqueue(
        event.account_id,
        "inbound",
        {
            "external_id": str(event.external_id),
            "instance_name": event.instance_name,
            "wa_message_id": event.wa_message_id,
            "from_number": event.from_number,
            "preview": event.preview,
            "received_at": event.received_at.isoformat() if event.received_at else None,
            "payload": event.payload,
        },
    )
