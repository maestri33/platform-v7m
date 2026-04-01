"""Geracao de imagens via Gemini."""

import copy
import logging
import uuid
from pathlib import Path

from django.conf import settings

from apps.common.services.upload_paths import build_service_upload_path
from services.base import ServiceResponse

from ..client import get_gemini_client
from ..constants import (
    DEFAULT_GEMINI_ASPECT_RATIO,
    DEFAULT_GEMINI_IMAGE_MODEL,
    DEFAULT_GEMINI_IMAGE_MODELS,
    DEFAULT_GEMINI_IMAGE_SIZE,
)
from ..normalizers import extract_image_from_part, extract_response_parts, extract_response_text
from ..schemas import GeminiImageResult

logger = logging.getLogger(__name__)

RETRYABLE_GEMINI_STATUS_CODES = {404, 429, 500, 502, 503, 504}


def _save_image(image):
    generated_uuid = uuid.uuid4()
    rel_path = build_service_upload_path("ai", "gemini", generated_uuid, f"{generated_uuid}.jpg")
    abs_path = Path(settings.MEDIA_ROOT) / rel_path
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    if image.mode != "RGB":
        image = image.convert("RGB")
    image.save(abs_path, format="JPEG")
    return rel_path


def _create_image_log(**kwargs):
    """Persiste log sem quebrar a resposta principal."""

    try:
        from ..models import GeminiImageLog

        log = GeminiImageLog.objects.create(**kwargs)
        return str(log.id)
    except Exception as exc:
        logger.exception("Falha ao persistir log do Gemini: %s", exc)
        return ""


def _build_image_result(
    *,
    success,
    prompt,
    model,
    operation,
    log_id="",
    rel_path="",
    response_text="",
    response_data=None,
    error="",
):
    return GeminiImageResult(
        success=success,
        operation=operation,
        prompt=prompt,
        model=model,
        image_path=rel_path,
        image_url=f"{settings.APP_BASE_URL}{settings.MEDIA_URL}{rel_path}" if rel_path else "",
        log_id=log_id,
        response_text=response_text,
        response_data=response_data or {},
        error=error,
    )


def _resolve_candidate_models(model=None):
    if model:
        return [model]

    configured_models = getattr(settings, "GEMINI_IMAGE_MODELS", DEFAULT_GEMINI_IMAGE_MODELS)
    models = [item for item in configured_models if item]
    return models or [DEFAULT_GEMINI_IMAGE_MODEL]


def _sanitize_request_data(request_data):
    sanitized = copy.deepcopy(request_data)
    for content in sanitized.get("contents", []):
        for part in content.get("parts", []):
            inline_data = part.get("inline_data") or part.get("inlineData")
            if inline_data and inline_data.get("data"):
                inline_data["data"] = "<TRUNCATED_BASE64>"
    return sanitized


def _normalize_error_message(payload):
    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict):
            code = error.get("code")
            status = error.get("status")
            message = error.get("message") or str(error)
            prefix = " / ".join(str(item) for item in [code, status] if item)
            return f"{prefix}: {message}" if prefix else message
    return str(payload)


def _request_image_generation(*, request_data, candidate_models):
    client = get_gemini_client()
    attempts = []

    for candidate_model in candidate_models:
        try:
            response = client.generate_content(model=candidate_model, payload=request_data)
        except Exception as exc:
            attempts.append(
                {
                    "model": candidate_model,
                    "status_code": None,
                    "error": str(exc),
                }
            )
            continue

        if response["ok"]:
            return candidate_model, response, attempts

        error_message = _normalize_error_message(response["data"])
        attempts.append(
            {
                "model": candidate_model,
                "status_code": response["status_code"],
                "error": error_message,
            }
        )
        if response["status_code"] not in RETRYABLE_GEMINI_STATUS_CODES:
            raise ValueError(error_message)

    if attempts:
        raise ValueError(attempts[-1]["error"])
    raise ValueError("Nenhum modelo Gemini configurado para geracao de imagens.")


def generate_image_from_prompt(
    *,
    prompt,
    aspect_ratio=DEFAULT_GEMINI_ASPECT_RATIO,
    image_size=DEFAULT_GEMINI_IMAGE_SIZE,
    model=None,
):
    """Gera imagem a partir de prompt com resposta padronizada."""

    request_data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["Image"],
            "imageConfig": {
                "aspectRatio": aspect_ratio,
                "imageSize": image_size,
            },
        },
    }
    candidate_models = _resolve_candidate_models(model)
    selected_model = candidate_models[0]
    sanitized_request_data = _sanitize_request_data(request_data)

    try:
        selected_model, response, attempts = _request_image_generation(
            request_data=request_data,
            candidate_models=candidate_models,
        )
        response_data_payload = response["data"]
        parts = extract_response_parts(response_data_payload)
        saved_path = ""
        for part in parts:
            image = extract_image_from_part(part)
            if image is not None:
                saved_path = _save_image(image)
                break
        if not saved_path:
            raise ValueError("Nenhuma imagem foi gerada na resposta.")

        response_text = extract_response_text(response_data_payload)
        response_data = {
            "parts_count": len(parts),
            "status_code": response["status_code"],
            "attempted_models": attempts,
            "selected_model": selected_model,
        }
        log_id = _create_image_log(
            prompt_text=prompt,
            image_path=saved_path,
            request_data=sanitized_request_data,
            response_data=response_data,
            response_text=response_text or "OK",
        )
        return ServiceResponse.ok(
            data=_build_image_result(
                success=True,
                prompt=prompt,
                model=selected_model,
                operation="generate",
                log_id=log_id,
                rel_path=saved_path,
                response_text=response_text,
                response_data=response_data,
            )
        )
    except Exception as exc:
        response_data = {
            "exception": str(exc),
            "attempted_models": candidate_models,
        }
        log_id = _create_image_log(
            prompt_text=prompt,
            request_data=sanitized_request_data,
            response_data=response_data,
            response_text=str(exc),
        )
        return ServiceResponse(
            success=False,
            error=str(exc),
            data=_build_image_result(
                success=False,
                prompt=prompt,
                model=selected_model,
                operation="generate",
                log_id=log_id,
                response_text=str(exc),
                response_data=response_data,
                error=str(exc),
            ),
        )
