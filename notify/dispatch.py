"""Despacho do notify-server (Django-Q) — porte do monólito com multi-tenant.

G16 — 3 fases: CLAIM (select_for_update → SENDING) → ENVIO (fora da transação) → RESULTADO.
Config de cada canal vem das rows da conta (WhatsAppNumber, MailIdentity, TtsVoices).

A lógica de cada canal (WhatsApp, e-mail, TTS) vive em `notify.channels`. Este
módulo só decide o que despachar e quando, e é o entrypoint do django-q.
"""

from __future__ import annotations

import logging

from django.conf import settings
from django.db import transaction

from notify.channels import dispatch_channels
from notify.models import (
    STATUS_PENDING,
    STATUS_SENDING,
    Notification,
)

logger = logging.getLogger(__name__)


def dispatch(notification_id: int) -> None:
    """Envia a Notification pelos canais pendentes (G16 — 3 fases).

    Entrypoint do django-q. O worker engole a exceção em `Task.result`, então o
    que escapar daqui é reportado ao Sentry antes de subir (o raise é o que faz
    o django-q marcar falha e retentar).
    """
    from notify_server import sentry

    try:
        _dispatch(notification_id)
    except Exception as exc:
        sentry.capture_task_failure(exc, task="notify.dispatch.dispatch", notification_id=notification_id)
        raise


def _dispatch(notification_id: int) -> None:
    # ── FASE 1: CLAIM ────────────────────────────────────────────────────────
    with transaction.atomic():
        notif = Notification.objects.select_for_update().filter(id=notification_id).first()
        if notif is None:
            logger.warning("notify.dispatch_missing id=%s", notification_id)
            return

        notif.attempts += 1

        # TEST_MODE: dry-run
        if settings.TEST_MODE:
            if notif.whatsapp_status == STATUS_PENDING:
                notif.whatsapp_status = "sent"
            if notif.email_status == STATUS_PENDING:
                notif.email_status = "sent"
            if notif.tts_status == STATUS_PENDING:
                notif.tts_status = "sent"
            notif.save()
            logger.info("notify.dispatched_dry_run external_id=%s", notif.external_id)
            return

        wa_pending = notif.whatsapp_status == STATUS_PENDING
        wa_recover = notif.whatsapp_status == STATUS_SENDING
        email_pending = notif.email_status == STATUS_PENDING
        email_recover = notif.email_status == STATUS_SENDING
        tts_pending = notif.want_tts and notif.tts_status == STATUS_PENDING

        do_whatsapp = wa_pending or wa_recover
        do_email = email_pending or email_recover
        if wa_recover or email_recover:
            logger.warning("notify.recovering_as_text external_id=%s", notif.external_id)

        if not (do_whatsapp or do_email):
            notif.save(update_fields=["attempts"])
            return

        if do_whatsapp:
            notif.whatsapp_status = STATUS_SENDING
        if do_email:
            notif.email_status = STATUS_SENDING
        if tts_pending:
            notif.tts_status = STATUS_SENDING
        notif.save()

    # ── FASE 2: ENVIO (fora da transação) ────────────────────────────────────
    dispatch_channels(
        notif,
        do_whatsapp=do_whatsapp,
        wa_recover=wa_recover,
        do_email=do_email,
        tts_pending=tts_pending,
    )

    # ── FASE 3: RESULTADO ────────────────────────────────────────────────────
    with transaction.atomic():
        notif.save()
        logger.info("notify.dispatched external_id=%s", notif.external_id)
