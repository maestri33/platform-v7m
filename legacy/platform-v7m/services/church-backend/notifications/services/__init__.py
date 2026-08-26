"""Servicos publicos do app notifications."""

from .dispatch import send_notification
from .domain import build_delivery_bundle, resolve_whatsapp_delivery_mode
from .emailing import send_notification_email
from .evolutionapi import send_audio_message, send_media_message, send_text_message
from .queue import enqueue_notification, process_due_notifications
from .recipients import resolve_notification_recipient
from .rendering import (
    build_tts_input,
    build_whatsapp_markdown_message,
    decode_media_payload,
    ensure_media_filename,
    markdown_to_html,
    markdown_to_text,
)

__all__ = [
    "build_delivery_bundle",
    "build_tts_input",
    "build_whatsapp_markdown_message",
    "decode_media_payload",
    "ensure_media_filename",
    "enqueue_notification",
    "markdown_to_html",
    "markdown_to_text",
    "process_due_notifications",
    "resolve_whatsapp_delivery_mode",
    "resolve_notification_recipient",
    "send_audio_message",
    "send_media_message",
    "send_notification",
    "send_notification_email",
    "send_text_message",
]
