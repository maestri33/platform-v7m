"""Camada pública para análise de imagem via Groq."""

import base64
import json
import tempfile
from pathlib import Path

from services.base import ServiceResponse

from .client import analyze_image

ALLOWED_STATUSES = {"approved", "pending", "rejected"}


def _parse_json_response(raw_text):
    text = (raw_text or "").strip()
    if text.startswith("```"):
        parts = [item for item in text.split("```") if item.strip()]
        text = parts[-1].strip() if parts else text
        if text.lower().startswith("json"):
            text = text[4:].strip()

    payload = json.loads(text)
    if not isinstance(payload, dict):
        raise ValueError("Resposta JSON invalida da Groq.")
    return payload


def analyze_document_selfie_base64(*, image_base64, filename="document-selfie.jpg"):
    """Analisa imagem em base64 e normaliza retorno para o domínio."""

    try:
        binary = base64.b64decode(image_base64)
    except Exception:
        return ServiceResponse.fail("Imagem em base64 inválida.")

    suffix = Path(filename).suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as temp_file:
        temp_file.write(binary)
        temp_file.flush()
        response = analyze_image(
            image_path=temp_file.name,
            prompt_text=(
                "Analise a imagem enviada de uma pessoa com documento. "
                'Responda somente em JSON no formato {"status":"approved|pending|rejected","notes":"..."} '
                "com uma justificativa curta em portugues."
            ),
            response_format={"type": "json_object"},
        )

    if not response:
        return ServiceResponse.fail(response.error or "Falha na análise de imagem.")

    log = response.data
    try:
        payload = _parse_json_response(getattr(log, "response_text", "") or "")
    except Exception as exc:
        return ServiceResponse.fail(
            f"Resposta da Groq nao veio em JSON estruturado: {exc}"
        )

    status = str(payload.get("status", "pending")).strip().lower()
    if status not in ALLOWED_STATUSES:
        status = "pending"

    return ServiceResponse.ok(
        data={
            "status": status,
            "notes": str(payload.get("notes", "")).strip() or "Analise concluida.",
            "groq_log_id": str(getattr(log, "id", "")) if getattr(log, "id", None) else None,
        }
    )
