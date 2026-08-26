"""Regras de negocio e bundle de entrega para notificacoes."""

from dataclasses import dataclass

from .rendering import (
    build_tts_input,
    build_whatsapp_markdown_message,
    ensure_media_filename,
    markdown_to_html,
    markdown_to_text,
)


@dataclass(frozen=True)
class MediaBundle:
    """Representa a mídia opcional associada à notificação."""

    payload: str
    media_type: str
    filename: str
    mime_type: str

    @property
    def is_reference_url(self):
        return self.payload.startswith(("http://", "https://"))

    @property
    def kind_label(self):
        return {
            "image": "Imagem",
            "video": "Video",
            "audio": "Audio",
            "document": "Documento",
        }.get(self.media_type, "Arquivo")

    @property
    def attachment_summary(self):
        return f"{self.kind_label} anexad{'a' if self.media_type == 'image' else 'o'} ao e-mail."

    @property
    def reference_summary(self):
        return f"{self.kind_label} disponivel por link."


@dataclass(frozen=True)
class DeliveryBundle:
    """Representa o conteúdo final de entrega em todos os canais."""

    subject_text: str
    whatsapp_text: str
    email_text: str
    title_html: str
    content_html: str
    tts_text: str
    tts_context: dict
    template_name: str
    media: MediaBundle | None


def build_delivery_bundle(notification):
    """Monta uma vez o conteúdo derivado da notificação para todos os canais."""

    subject_text = markdown_to_text(notification.title)
    whatsapp_text = build_whatsapp_markdown_message(notification.title, notification.content)
    media = None
    payload = str(notification.resolved_media_payload or "").strip()
    if payload:
        media = MediaBundle(
            payload=payload,
            media_type=notification.media_type,
            filename=ensure_media_filename(
                notification.media_filename,
                notification.media_type,
                notification.media_mime_type,
            ),
            mime_type=str(notification.media_mime_type or "").strip(),
        )

    return DeliveryBundle(
        subject_text=subject_text,
        whatsapp_text=whatsapp_text,
        email_text=markdown_to_text(whatsapp_text),
        title_html=markdown_to_html(notification.title),
        content_html=markdown_to_html(notification.content),
        tts_text=build_tts_input(notification.title, notification.content),
        tts_context={"title": subject_text},
        template_name=notification.template_name or "email_notification.html",
        media=media,
    )


def resolve_whatsapp_delivery_mode(notification):
    """Define a precedência do envio de WhatsApp."""

    if notification.has_media_payload:
        return "media"
    if notification.use_tts:
        return "tts"
    return "text"
