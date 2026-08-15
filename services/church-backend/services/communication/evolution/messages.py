"""Envio de mensagens via Evolution API - simplificado."""

from services.communication.evolution.requests.message.send_audio import send_audio as request_send_audio
from services.communication.evolution.requests.message.send_media import send_media as request_send_media
from services.communication.evolution.requests.message.send_text import send_text as request_send_text
from services.communication.evolution.requests.tools.check_numbers import check_numbers


def _normalize_response(response):
    """Padroniza resposta da Evolution."""

    http_status = response.get("_http_status")
    success = 200 <= int(http_status or 0) < 300
    data = response.get("data", response)
    return {"success": success, "status_code": http_status, "data": data}


def send_text(number, text, delay=0):
    """Envia texto para WhatsApp."""
    return _normalize_response(request_send_text(number=number, text=text, delay=delay))


def send_audio(number, audio_url):
    """Envia áudio para WhatsApp."""
    return _normalize_response(request_send_audio(number=number, audio=audio_url))


def send_media(number, media_url, media_type="image", caption="", file_name="", mime_type=""):
    """Envia imagem, vídeo ou documento."""
    mimetypes = {
        "image": "image/jpeg",
        "video": "video/mp4",
        "audio": "audio/mp3",
        "document": "application/pdf",
    }
    file_names = {
        "image": "media.jpg",
        "video": "media.mp4",
        "audio": "media.mp3",
        "document": "media.pdf",
    }
    return _normalize_response(
        request_send_media(
            number=number,
            media=media_url,
            media_type=media_type,
            mime_type=mime_type or mimetypes.get(media_type, "application/octet-stream"),
            caption=caption,
            file_name=file_name or file_names.get(media_type, "media.bin"),
        )
    )


def validate_number(number):
    """Valida se o número existe no WhatsApp."""

    response = check_numbers(numbers=[number])
    data = response.get("data", [])
    first = data[0] if data else {}
    return {
        "success": bool(first.get("exists")),
        "status_code": response.get("_http_status"),
        "data": first,
    }
