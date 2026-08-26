"""Cliente e servicos base da integracao Groq."""

import base64
import copy
import mimetypes
from pathlib import Path

from django.conf import settings
from groq import APIConnectionError, APIStatusError, Groq, RateLimitError
from PIL import Image, UnidentifiedImageError

from services.base import ServiceResponse

MAX_BASE64_IMAGE_BYTES = 4 * 1024 * 1024
MAX_IMAGE_PIXELS = 33_000_000


def get_groq_client():
    """Retorna o client oficial da Groq configurado pelo settings."""

    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY nao configurada no ambiente")

    return Groq(
        api_key=settings.GROQ_API_KEY,
        timeout=settings.GROQ_REQUEST_TIMEOUT,
        max_retries=2,
    )


def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


def _resolve_image_path(image_path):
    path = Path(image_path)
    if not path.is_absolute():
        path = Path(settings.BASE_DIR) / path
    return path


def _validate_image(abs_path):
    if not abs_path.exists():
        return ServiceResponse.fail(f"Imagem nao encontrada: {abs_path}")

    size_bytes = abs_path.stat().st_size
    if size_bytes > MAX_BASE64_IMAGE_BYTES:
        return ServiceResponse.fail(
            "Imagem excede o limite suportado para envio em base64 pela Groq (4 MB)."
        )

    mime_type, _ = mimetypes.guess_type(abs_path.name)
    if not mime_type:
        mime_type = "image/jpeg"

    try:
        with Image.open(abs_path) as image:
            width, height = image.size
    except UnidentifiedImageError:
        return ServiceResponse.fail("Arquivo de imagem invalido ou nao suportado.")

    if width * height > MAX_IMAGE_PIXELS:
        return ServiceResponse.fail("Imagem excede o limite de resolucao suportado pela Groq.")

    return ServiceResponse.ok(
        data={
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "width": width,
            "height": height,
        }
    )


def _build_error_payload(*, error_type, message, status_code=None, body=None):
    payload = {
        "error_type": error_type,
        "message": message,
    }
    if status_code is not None:
        payload["status_code"] = status_code
    if body is not None:
        payload["body"] = body
    return payload


def _persist_failure(log, *, error_type, message, status_code=None, body=None):
    payload = _build_error_payload(
        error_type=error_type,
        message=message,
        status_code=status_code,
        body=body,
    )
    log.response_data = payload
    log.response_text = message
    log.save(update_fields=["response_data", "response_text"])
    return ServiceResponse.fail(message)


def analyze_image(
    image_path,
    prompt_text,
    default_model=None,
    response_format=None,
):
    """Analisa uma imagem local usando a API Vision da Groq e salva log no BD."""

    model_name = default_model or settings.GROQ_VISION_MODEL
    abs_path = _resolve_image_path(image_path)
    validation = _validate_image(abs_path)
    if not validation:
        return validation

    metadata = validation.data
    base64_image = encode_image(abs_path)

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": prompt_text,
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{metadata['mime_type']};base64,{base64_image}"
                    },
                },
            ],
        }
    ]

    log_request_data = {
        "model": model_name,
        "messages": copy.deepcopy(messages),
        "image_metadata": metadata,
    }
    if response_format:
        log_request_data["response_format"] = copy.deepcopy(response_format)
    log_request_data["messages"][0]["content"][1]["image_url"]["url"] = (
        f"data:{metadata['mime_type']};base64,<TRUNCATED>"
    )

    from .models import GroqVisionLog

    log = GroqVisionLog.objects.create(
        image_path=image_path,
        prompt_text=prompt_text,
        request_data=log_request_data,
    )

    try:
        client = get_groq_client()
        request_kwargs = {
            "messages": messages,
            "model": model_name,
        }
        if response_format:
            request_kwargs["response_format"] = response_format

        chat_completion = client.chat.completions.create(**request_kwargs)
        response_data = (
            chat_completion.model_dump()
            if hasattr(chat_completion, "model_dump")
            else {"raw": str(chat_completion)}
        )
        response_text = chat_completion.choices[0].message.content or ""

        log.response_data = response_data
        log.response_text = response_text
        log.save(update_fields=["response_data", "response_text"])
        return ServiceResponse.ok(data=log)
    except RateLimitError as exc:
        return _persist_failure(
            log,
            error_type="rate_limit",
            message=f"Groq rate limit: {exc}",
            status_code=getattr(exc, "status_code", None),
            body=getattr(exc, "body", None),
        )
    except APIConnectionError as exc:
        return _persist_failure(
            log,
            error_type="connection_error",
            message=f"Falha de conexao com a Groq: {exc}",
        )
    except APIStatusError as exc:
        return _persist_failure(
            log,
            error_type="api_status_error",
            message=f"Erro da API Groq: {exc}",
            status_code=getattr(exc, "status_code", None),
            body=getattr(exc, "body", None),
        )
    except Exception as exc:
        return _persist_failure(
            log,
            error_type="unexpected_error",
            message=f"Erro inesperado no servico Groq: {exc}",
        )


analyze_image_with_groq = analyze_image
