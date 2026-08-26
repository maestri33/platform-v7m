"""Edicao de imagens via Gemini."""

import base64
import mimetypes
from pathlib import Path

from services.base import ServiceResponse

from ..constants import (
    DEFAULT_GEMINI_ASPECT_RATIO,
    DEFAULT_GEMINI_IMAGE_SIZE,
)
from ..normalizers import extract_image_from_part, extract_response_parts, extract_response_text
from .generation import (
    _build_image_result,
    _create_image_log,
    _request_image_generation,
    _resolve_candidate_models,
    _sanitize_request_data,
    _save_image,
)


def edit_image_from_prompt(
    *,
    image_path,
    prompt,
    aspect_ratio=DEFAULT_GEMINI_ASPECT_RATIO,
    image_size=DEFAULT_GEMINI_IMAGE_SIZE,
    model=None,
):
    """Edita imagem existente a partir de prompt com resposta padronizada."""

    source_path = Path(image_path)
    if not source_path.exists():
        return ServiceResponse.fail(f"Arquivo nao encontrado: {image_path}")

    image_bytes = source_path.read_bytes()
    mime_type, _ = mimetypes.guess_type(source_path.name)
    if not mime_type:
        mime_type = "image/png"

    request_data = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(image_bytes).decode("ascii"),
                        }
                    },
                ]
            }
        ],
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
            raise ValueError("Nenhuma imagem editada foi gerada na resposta.")

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
                operation="edit",
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
                operation="edit",
                log_id=log_id,
                response_text=str(exc),
                response_data=response_data,
                error=str(exc),
            ),
        )
