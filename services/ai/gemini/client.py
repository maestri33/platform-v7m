"""Cliente oficial do Gemini adaptado ao contrato interno."""

import base64

from django.conf import settings
from google import genai
from google.genai import types


class GeminiSdkClient:
    """Adapter fino sobre o SDK oficial do Gemini."""

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY nao configurada no .env")
        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(
                apiVersion="v1beta",
                timeout=max(int(settings.GEMINI_REQUEST_TIMEOUT), 1) * 1000,
            ),
        )

    def _build_contents(self, payload):
        contents = []
        for content in payload.get("contents", []):
            for part in content.get("parts", []):
                text = part.get("text")
                if text:
                    contents.append(text)
                    continue

                inline_data = part.get("inline_data") or part.get("inlineData")
                if not inline_data:
                    continue

                raw_data = inline_data.get("data")
                mime_type = inline_data.get("mime_type") or inline_data.get("mimeType")
                if not raw_data or not mime_type:
                    continue
                if isinstance(raw_data, str):
                    raw_data = base64.b64decode(raw_data)
                contents.append(types.Part.from_bytes(data=raw_data, mime_type=mime_type))
        return contents

    def _build_config(self, payload):
        generation_config = payload.get("generationConfig") or {}
        image_config = generation_config.get("imageConfig") or {}
        response_modalities = generation_config.get("responseModalities") or None

        config_kwargs = {}
        if response_modalities:
            config_kwargs["response_modalities"] = [str(item).upper() for item in response_modalities]
        if image_config:
            config_kwargs["image_config"] = types.ImageConfig(
                aspect_ratio=image_config.get("aspectRatio"),
                image_size=image_config.get("imageSize"),
            )

        return types.GenerateContentConfig(**config_kwargs) if config_kwargs else None

    def _normalize_error(self, exc):
        status_code = getattr(exc, "status_code", None) or 500
        status = getattr(exc, "__class__", type(exc)).__name__.upper()
        body = getattr(exc, "body", None)
        message = str(exc)
        data = {"error": {"code": status_code, "status": status, "message": message}}
        if body is not None:
            data["error"]["details"] = body
        return {
            "status_code": status_code,
            "ok": False,
            "data": data,
        }

    def generate_content(self, *, model, payload):
        """Executa geração de conteúdo usando o SDK oficial."""

        try:
            response = self.client.models.generate_content(
                model=model,
                contents=self._build_contents(payload),
                config=self._build_config(payload),
            )
            return {
                "status_code": 200,
                "ok": True,
                "data": response,
            }
        except Exception as exc:
            return self._normalize_error(exc)


def get_gemini_client():
    """Retorna client do Gemini configurado pelo settings."""

    return GeminiSdkClient()
