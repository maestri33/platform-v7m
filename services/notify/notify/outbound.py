"""Devolução de eventos para o webhook do app (status e mensagens recebidas).

O notify é relay: ele não guarda conversa, ele conta o que aconteceu. Quem
precisa do histórico é o app, e o caminho é este — um POST assinado para a URL
que a conta cadastrou.

Três decisões:

1. **Retry com backoff exponencial CONTROLADO AQUI** (P2). Falha não relança
   para a Django-Q re-tentar no ritmo dela: cada falha agenda a próxima
   tentativa via `Schedule` once — 1min, 2min, 4min... até
   `WEBHOOK_MAX_ATTEMPTS`. Assim o backoff é exponencial de verdade e cada
   tentativa fica registrada.

2. **Cada tentativa vira uma linha em `WebhookDelivery`.** `last_*` no
   AppWebhook diz "como está"; a tabela diz "o que aconteceu" — é ela que o
   painel mostra quando o app do outro lado está intermitente.

3. **Assinatura é opcional.** Dentro da VPN, exigir segredo em todo app só
   atrasa a integração. Se a conta preencher `secret`, assinamos em HMAC-SHA256.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import uuid

import httpx
import structlog
from django.conf import settings
from django.utils import timezone

logger = structlog.get_logger()

TIMEOUT_S = 10.0


def _max_attempts() -> int:
    return int(getattr(settings, "WEBHOOK_MAX_ATTEMPTS", 5))


def _sign(secret: str, body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _record(hook, event: str, attempt: int, payload: dict, status_code, error: str) -> None:
    from channels.models import WebhookDelivery

    try:
        WebhookDelivery.objects.create(
            account_id=hook.account_id,
            event=event,
            url=hook.url,
            attempt=attempt,
            status_code=status_code,
            error=error[:1000],
            payload_preview=json.dumps(payload, ensure_ascii=False)[:280],
        )
    except Exception:  # noqa: BLE001 — auditoria nunca derruba a entrega
        logger.warning("notify.webhook.audit_failed", account_id=hook.account_id)


def _schedule_retry(account_id: int, event: str, payload: dict, attempt: int) -> None:
    """Agenda a próxima tentativa com backoff exponencial (1, 2, 4... min)."""
    from datetime import timedelta

    try:
        from django_q.models import Schedule
        from django_q.tasks import schedule

        wait_min = 2 ** (attempt - 1)
        schedule(
            "notify.outbound.deliver",
            account_id,
            event,
            payload,
            attempt + 1,
            schedule_type=Schedule.ONCE,
            next_run=timezone.now() + timedelta(minutes=wait_min),
        )
        logger.info(
            "notify.webhook.retry_scheduled",
            account_id=account_id,
            evento=event,
            tentativa=attempt + 1,
            em_minutos=wait_min,
        )
    except Exception:  # noqa: BLE001 — sem cluster (dev/test), não há retry agendado
        logger.warning("notify.webhook.retry_unavailable", account_id=account_id)


def deliver(account_id: int, event: str, payload: dict, attempt: int = 1) -> None:
    """Entrega UM evento ao webhook da conta; falha agenda a próxima tentativa."""
    from channels.models import AppWebhook

    hook = AppWebhook.objects.filter(account_id=account_id).first()
    if hook is None or not hook.wants(event):
        return

    body = json.dumps({"event": event, "data": payload}, ensure_ascii=False).encode()
    headers = {
        "Content-Type": "application/json",
        "X-Notify-Event": event,
        "X-Notify-Account": hook.account.slug,
        "X-Notify-Attempt": str(attempt),
    }
    if hook.secret:
        headers["X-Notify-Signature"] = _sign(hook.secret, body)

    hook.last_delivery_at = timezone.now()
    try:
        resp = httpx.post(hook.url, content=body, headers=headers, timeout=TIMEOUT_S)
    except Exception as exc:  # noqa: BLE001
        erro = f"{type(exc).__name__}: {exc}"[:300]
        hook.last_status = None
        hook.last_error = erro
        hook.save(update_fields=["last_status", "last_error", "last_delivery_at"])
        _record(hook, event, attempt, payload, None, erro)
        logger.warning(
            "notify.webhook.transport_error",
            account_id=account_id, evento=event, tentativa=attempt,
        )
        if attempt < _max_attempts():
            _schedule_retry(account_id, event, payload, attempt)
        return

    hook.last_status = resp.status_code
    hook.last_error = "" if resp.status_code < 400 else resp.text[:300]
    hook.save(update_fields=["last_status", "last_error", "last_delivery_at"])
    _record(hook, event, attempt, payload, resp.status_code, hook.last_error)

    if resp.status_code >= 400:
        logger.warning(
            "notify.webhook.rejected",
            account_id=account_id, evento=event, status=resp.status_code, tentativa=attempt,
        )
        if attempt < _max_attempts():
            _schedule_retry(account_id, event, payload, attempt)
        return
    logger.info("notify.webhook.delivered", account_id=account_id, evento=event, tentativa=attempt)


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


def status_payload(notif, stage: str = "update") -> dict:
    return {
        "stage": stage,  # queued | dispatched | delivery | update
        "external_id": str(notif.external_id),
        "idempotency_key": notif.idempotency_key,
        "caller": notif.caller,
        "recipient_phone": notif.recipient_phone,
        "recipient_email": notif.recipient_email,
        "whatsapp_status": notif.whatsapp_status,
        "email_status": notif.email_status,
        "sms_status": notif.sms_status,
        "delivery_status": notif.delivery_status or None,
        "provider_message_id": notif.provider_message_id,
        "driver_used": notif.driver_used or None,
        "attempts": notif.attempts,
        "whatsapp_error": notif.whatsapp_error,
        "email_error": notif.email_error,
        "updated_at": timezone.now().isoformat(),
    }


def push_status(notif, stage: str = "update") -> None:
    """Chame depois de mudar o estado de entrega de uma Notification.

    `stage` marca o momento do ciclo (P1): "queued" no aceite, "dispatched"
    após o envio, "delivery" quando o provedor confirma entregue/lido.
    """
    _enqueue(notif.account_id, "status", status_payload(notif, stage))


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
