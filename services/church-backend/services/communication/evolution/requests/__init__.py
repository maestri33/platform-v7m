"""Cliente base HTTP para chamadas da Evolution API."""

import time

import requests
from django.conf import settings
from urllib.parse import urljoin

from services.communication.evolution.models import create_evolution_api_log

REDIRECT_STATUS_CODES = {301, 302, 307, 308}
MAX_LOG_TEXT_LENGTH = 2000
MAX_LOG_PREVIEW_LENGTH = 120


class EvolutionRequestClient:
    """Encapsula configuracoes de URL base, instancia e autenticacao."""

    def __init__(self):
        self.base_url = settings.EVOLUTION_API_URL.rstrip("/")
        self.instance = settings.EVOLUTION_INSTANCE
        self.timeout = settings.EVOLUTION_REQUEST_TIMEOUT
        self.api_key = settings.EVOLUTION_API_KEY
        self.session = requests.Session()

    def _headers(self):
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["apikey"] = self.api_key
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def normalize_number(self, number):
        """Normaliza numero para padrao BR com DDI 55."""
        digits = "".join(ch for ch in str(number) if ch.isdigit())
        if not digits:
            raise ValueError("number is required")
        if digits.startswith("55"):
            return digits
        return f"55{digits}"

    def _normalize_operation(self, path):
        segments = [segment for segment in str(path or "").split("/") if segment]
        if segments and segments[-1] == self.instance:
            segments = segments[:-1]
        return ".".join(segments)

    def _truncate_text(self, value, limit=MAX_LOG_TEXT_LENGTH):
        text = str(value or "")
        if len(text) <= limit:
            return text
        return f"{text[:limit]}... <TRUNCATED:{len(text)}>"

    def _sanitize_log_data(self, value, *, key_name=""):
        if value is None or isinstance(value, (bool, int, float)):
            return value
        if isinstance(value, str):
            normalized_key = str(key_name or "").strip().lower()
            if normalized_key in {"audio", "media"}:
                stripped = value.strip()
                if stripped.startswith(("http://", "https://")):
                    return self._truncate_text(stripped)
                return {
                    "preview": f"{stripped[:MAX_LOG_PREVIEW_LENGTH]}...",
                    "truncated": True,
                    "original_length": len(stripped),
                }
            return self._truncate_text(value)
        if isinstance(value, dict):
            return {
                str(key): self._sanitize_log_data(item, key_name=str(key))
                for key, item in value.items()
            }
        if isinstance(value, (list, tuple, set)):
            return [self._sanitize_log_data(item, key_name=key_name) for item in value]
        return self._truncate_text(value)

    def _normalize_response(self, response):
        try:
            data = response.json() if response.content else {}
        except ValueError:
            data = {"raw_text": response.text}

        if isinstance(data, dict):
            data["_http_status"] = response.status_code
            return data
        if isinstance(data, list):
            return {"data": data, "_http_status": response.status_code}

        return {"data": data, "_http_status": response.status_code}

    def _request(self, method, path, payload=None, params=None):
        """Executa request HTTP preservando método em redirects de proxy."""

        url = f"{self.base_url}/{path.lstrip('/')}"
        started_at = time.monotonic()
        response = None
        normalized_response = None
        error_message = ""
        request_kwargs = {
            "method": method,
            "url": url,
            "headers": self._headers(),
            "timeout": self.timeout,
            "allow_redirects": False,
        }
        if payload is not None:
            request_kwargs["json"] = payload
        if params is not None:
            request_kwargs["params"] = params
        logged_input = payload if payload is not None else params

        try:
            response = self.session.request(**request_kwargs)

            if response.status_code in REDIRECT_STATUS_CODES and response.headers.get("Location"):
                redirected_url = urljoin(url, response.headers["Location"])
                redirected_request_kwargs = dict(request_kwargs)
                redirected_request_kwargs["url"] = redirected_url
                response = self.session.request(**redirected_request_kwargs)

            normalized_response = self._normalize_response(response)
            return normalized_response
        except Exception as exc:
            error_message = str(exc)
            raise
        finally:
            response_text = ""
            status_code = None
            success = False
            if response is not None:
                status_code = response.status_code
                success = 200 <= response.status_code < 300
                response_text = self._truncate_text(getattr(response, "text", ""))
            elif error_message:
                response_text = self._truncate_text(error_message)

            create_evolution_api_log(
                operation=self._normalize_operation(path),
                request_method=str(method or "").upper(),
                endpoint=url,
                instance=self.instance,
                target_number=str((logged_input or {}).get("number", "") or "")[:40] or None,
                success=success,
                status_code=status_code,
                duration_ms=int((time.monotonic() - started_at) * 1000),
                request_data=self._sanitize_log_data(logged_input),
                response_data=self._sanitize_log_data(normalized_response),
                response_text=response_text or None,
                error_message=error_message or None,
            )

    def post(self, path, payload):
        """Executa POST em endpoint relativo e retorna JSON com status."""

        return self._request("POST", path, payload)

    def get(self, path, params=None):
        """Executa GET em endpoint relativo e retorna JSON com status."""

        return self._request("GET", path, params=params)
