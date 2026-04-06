"""Orquestracao de envio por canal para notificacoes."""

import logging

from django.db import transaction
from django.utils import timezone

from services.ai.elevenlabs.services import generate_tts_audio

from notifications.models import Notification, NotificationLog

from .domain import build_delivery_bundle, resolve_whatsapp_delivery_mode
from .emailing import send_notification_email
from .evolutionapi import send_audio_message, send_media_message, send_text_message
from .recipients import resolve_notification_recipient

logger = logging.getLogger(__name__)


def _create_log(*, notification, channel, result=None, success=False, error_message="", extra_response=None):
    payload = {}
    if isinstance(result, dict):
        payload.update(result)
    if isinstance(extra_response, dict):
        payload.update(extra_response)

    if not success and not error_message and isinstance(result, dict):
        error_data = result.get("data", {})
        error_message = (
            str(error_data.get("raw_text", "")).strip()
            or str(result.get("error", "")).strip()
            or f"Provider returned status {result.get('status_code', 'unknown')}"
        )

    provider_message_id = ""
    if isinstance(result, dict):
        provider_message_id = str(result.get("data", {}).get("key", {}).get("id", "") or "")

    return NotificationLog.objects.create(
        notification=notification,
        channel=channel,
        success=success,
        response_data=payload,
        error_message=error_message,
        provider_message_id=provider_message_id,
    )


def _finalize_without_delivery(*, notification, error_message):
    notification.status = Notification.Status.FAILED
    notification.last_error_message = str(error_message or "").strip()
    notification.processed_at = timezone.now()
    notification.save(
        update_fields=[
            "status",
            "last_error_message",
            "processed_at",
        ]
    )


def _hydrate_scheduled_visitor_followup(notification):
    from apps.visitors.models import VisitorStatus
    from apps.visitors.notifications import (
        VISITOR_STATUS_FOLLOWUP_EVENT_KEY,
        build_visitor_14_notification_payload,
        build_visitor_21_notification_payload,
    )

    if notification.event_key != VISITOR_STATUS_FOLLOWUP_EVENT_KEY:
        return True

    visitor = getattr(notification.recipient, "visitor", None)
    if not visitor:
        _finalize_without_delivery(notification=notification, error_message="Visitante nao encontrado para follow-up agendado.")
        return False

    if int(visitor.status) == int(VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT):
        payload = build_visitor_14_notification_payload(visitor=visitor)
    elif int(visitor.status) == int(VisitorStatus.AWAITING_RECEPTION_CONTACT):
        payload = build_visitor_21_notification_payload(visitor=visitor)
    else:
        _finalize_without_delivery(
            notification=notification,
            error_message=f"Status {visitor.status} nao exige envio no follow-up agendado.",
        )
        return False

    notification.title = payload["title"]
    notification.content = payload["content"]
    notification.event_key = payload["event_key"]
    notification.use_tts = True
    notification.save(update_fields=["title", "content", "event_key", "use_tts"])
    return True


def _finalize_notification(notification):
    logs = list(notification.logs.all())
    whatsapp_ok = any(log.success for log in logs if log.channel == Notification.Channel.WHATSAPP)
    email_ok = any(log.success for log in logs if log.channel == Notification.Channel.EMAIL)

    if whatsapp_ok and email_ok:
        notification.status = Notification.Status.SENT
        notification.channel_sent = Notification.Channel.BOTH
        notification.sent_at = timezone.now()
    elif whatsapp_ok:
        notification.status = Notification.Status.SENT
        notification.channel_sent = Notification.Channel.WHATSAPP
        notification.sent_at = timezone.now()
    elif email_ok:
        notification.status = Notification.Status.SENT
        notification.channel_sent = Notification.Channel.EMAIL
        notification.sent_at = timezone.now()
    else:
        notification.status = Notification.Status.FAILED
        notification.last_error_message = "; ".join(
            [log.error_message for log in logs if log.error_message]
        )[:2000]

    notification.processed_at = timezone.now()
    notification.save(
        update_fields=[
            "status",
            "channel_sent",
            "sent_at",
            "processed_at",
            "last_error_message",
        ]
    )


def _print_notification_summary(*, notification, recipient=None):
    logs = list(notification.logs.all().order_by("created_at", "id"))
    recipient = recipient or {}

    phone = str(recipient.get("phone", "") or "").strip()
    email = str(recipient.get("email", "") or "").strip()
    whatsapp_mode = resolve_whatsapp_delivery_mode(notification)

    print("\n" + "=" * 80)
    print(f"[notifications] resumo final da notificacao #{notification.id}")
    print("-" * 80)
    print(f"event_key       : {notification.event_key or '-'}")
    print(f"status          : {notification.status}")
    print(f"channel_sent    : {notification.channel_sent or '-'}")
    print(f"attempts        : {notification.attempts}")
    print(f"recipient_id    : {notification.recipient_id}")
    print(f"recipient_phone : {phone or '-'}")
    print(f"recipient_email : {email or '-'}")
    print(f"scheduled_for   : {notification.scheduled_for or '-'}")
    print(f"processed_at    : {notification.processed_at or '-'}")
    print(f"sent_at         : {notification.sent_at or '-'}")
    print(f"use_tts         : {notification.use_tts}")
    print(f"is_media        : {notification.is_media}")
    print(f"media_type      : {notification.media_type or '-'}")
    print(f"whatsapp_mode   : {whatsapp_mode}")
    print(f"template_name   : {notification.template_name or 'email_notification.html'}")
    print(f"title           : {notification.title}")
    print(f"content         : {notification.content}")
    if notification.last_error_message:
        print(f"last_error      : {notification.last_error_message}")

    if logs:
        print("logs:")
        for index, log in enumerate(logs, start=1):
            print(
                f"  {index}. channel={log.channel} success={log.success} "
                f"provider_message_id={log.provider_message_id or '-'}"
            )
            if log.error_message:
                print(f"     error: {log.error_message}")
            if log.response_data:
                print(f"     response: {log.response_data}")
    else:
        print("logs            : -")

    print("=" * 80)


def _send_whatsapp_notification(*, notification, phone, bundle):
    mode = resolve_whatsapp_delivery_mode(notification)

    if mode == "media":
        result = send_media_message(
            number=phone,
            media_payload=bundle.media.payload,
            media_type=bundle.media.media_type,
            caption=bundle.whatsapp_text,
            filename=bundle.media.filename,
            mime_type=bundle.media.mime_type,
        )
        return _create_log(
            notification=notification,
            channel=Notification.Channel.WHATSAPP,
            result=result,
            success=bool(result.get("success")),
        )

    if mode == "tts":
        tts_response = generate_tts_audio(
            text=bundle.tts_text,
            context=bundle.tts_context,
        )
        if not tts_response or not getattr(tts_response, "data", None):
            raise RuntimeError(tts_response.error or "Falha ao gerar audio TTS.")

        audio_payload = (
            getattr(tts_response.data, "audio_base64", "")
            or getattr(tts_response.data, "audio_url", "")
        )
        if not audio_payload:
            raise RuntimeError("TTS nao retornou audio para envio.")

        result = send_audio_message(number=phone, audio_payload=audio_payload)
        return _create_log(
            notification=notification,
            channel=Notification.Channel.WHATSAPP,
            result=result,
            success=bool(result.get("success")),
            extra_response={"tts_log_id": getattr(tts_response.data, "log_id", "")},
        )

    result = send_text_message(number=phone, message=bundle.whatsapp_text)
    return _create_log(
        notification=notification,
        channel=Notification.Channel.WHATSAPP,
        result=result,
        success=bool(result.get("success")),
    )


@transaction.atomic
def send_notification(notification_id):
    """Envia notificação para WhatsApp e e-mail."""

    try:
        notification = Notification.objects.select_related(
            "recipient",
            "recipient__user",
            "recipient__phone",
            "recipient__visitor",
        ).get(id=notification_id)
    except Notification.DoesNotExist:
        logger.error("Notificacao %s nao encontrada", notification_id)
        return

    if notification.status == Notification.Status.SENT:
        return
    if notification.scheduled_for and notification.scheduled_for > timezone.now():
        return
    if not _hydrate_scheduled_visitor_followup(notification):
        return

    notification.status = Notification.Status.PROCESSING
    notification.attempts += 1
    notification.last_error_message = ""
    notification.save(update_fields=["status", "attempts", "last_error_message"])

    recipient = resolve_notification_recipient(notification.recipient)
    bundle = build_delivery_bundle(notification)

    phone = recipient["phone"]
    if phone:
        try:
            _send_whatsapp_notification(notification=notification, phone=phone, bundle=bundle)
        except Exception as exc:
            logger.exception("Erro ao enviar notificacao por WhatsApp: %s", exc)
            _create_log(
                notification=notification,
                channel=Notification.Channel.WHATSAPP,
                success=False,
                error_message=str(exc),
            )

    email = recipient["email"]
    if email:
        try:
            email_result = send_notification_email(
                notification=notification,
                recipient_email=email,
                bundle=bundle,
            )
            _create_log(
                notification=notification,
                channel=Notification.Channel.EMAIL,
                result={"data": email_result},
                success=True,
            )
        except Exception as exc:
            logger.exception("Erro ao enviar notificacao por e-mail: %s", exc)
            _create_log(
                notification=notification,
                channel=Notification.Channel.EMAIL,
                success=False,
                error_message=str(exc),
            )

    _finalize_notification(notification)
    _print_notification_summary(notification=notification, recipient=recipient)
