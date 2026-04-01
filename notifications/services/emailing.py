"""Entrega de notificacoes por e-mail."""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from .domain import build_delivery_bundle
from .rendering import decode_media_payload


def send_notification_email(*, notification, recipient_email, bundle=None):
    """Envia e-mail HTML/texto com anexo ou referencia de midia."""

    delivery_bundle = bundle or build_delivery_bundle(notification)

    media = delivery_bundle.media
    payload = media.payload if media else ""
    attachment_bytes = decode_media_payload(payload)
    attachment_name = ""
    media_summary = ""
    media_kind_label = ""
    media_reference_url = ""
    if media:
        attachment_name = media.filename
        media_kind_label = media.kind_label
        if attachment_bytes:
            media_summary = media.attachment_summary
        elif media.is_reference_url:
            media_reference_url = payload
            media_summary = media.reference_summary

    html_body = render_to_string(
        delivery_bundle.template_name,
        {
            "title": delivery_bundle.subject_text,
            "title_html": delivery_bundle.title_html,
            "content_html": delivery_bundle.content_html,
            "content_text": delivery_bundle.email_text,
            "has_media": bool(media),
            "media_kind_label": media_kind_label,
            "media_summary": media_summary,
            "attachment_name": attachment_name,
            "attached_media": bool(attachment_bytes),
            "media_reference_url": media_reference_url,
        },
    )

    message = EmailMultiAlternatives(
        subject=delivery_bundle.subject_text,
        body=delivery_bundle.email_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient_email],
    )
    message.attach_alternative(html_body, "text/html")

    if attachment_bytes:
        message.attach(
            attachment_name,
            attachment_bytes,
            media.mime_type or None,
        )

    message.send(fail_silently=False)
    return {
        "to": [recipient_email],
        "attached_media": bool(attachment_bytes),
        "attachment_name": attachment_name,
        "media_reference_url": media_reference_url,
    }
