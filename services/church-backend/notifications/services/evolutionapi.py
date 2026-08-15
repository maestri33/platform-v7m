"""Adaptadores de notificacao para Evolution API."""

from services.communication.evolution.messages import send_audio, send_media, send_text


def send_text_message(*, number, message):
    """Envia mensagem textual via Evolution."""

    return send_text(number=number, text=message)


def send_audio_message(*, number, audio_payload):
    """Envia audio/base64 via Evolution."""

    return send_audio(number=number, audio_url=audio_payload)


def send_media_message(
    *,
    number,
    media_payload,
    media_type="image",
    caption="",
    filename="",
    mime_type="",
):
    """Envia mídia via Evolution."""

    return send_media(
        number=number,
        media_url=media_payload,
        media_type=media_type,
        caption=caption,
        file_name=filename,
        mime_type=mime_type,
    )
