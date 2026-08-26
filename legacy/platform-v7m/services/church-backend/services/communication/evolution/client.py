"""Cliente HTTP simplificado para Evolution API."""

import logging

import requests
from django.conf import settings
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

REDIRECT_STATUS_CODES = {301, 302, 307, 308}


class EvolutionClient:
    """Cliente mínimo para Evolution API."""

    def __init__(self):
        self.base_url = settings.EVOLUTION_API_URL.rstrip("/")
        self.instance = settings.EVOLUTION_INSTANCE
        self.api_key = settings.EVOLUTION_API_KEY
        self.timeout = getattr(settings, "EVOLUTION_REQUEST_TIMEOUT", 30)
        self.session = requests.Session()

    def _url(self, endpoint):
        return f"{self.base_url}/{endpoint.lstrip('/')}/{self.instance}"

    def _headers(self):
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["apikey"] = self.api_key
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _normalize(self, number):
        """Normaliza para formato BR: 55 + DDD + número."""
        digits = "".join(c for c in str(number) if c.isdigit())
        if digits.startswith("55"):
            return digits
        return f"55{digits}"

    def post(self, endpoint, payload):
        """POST genérico com logging básico."""
        url = self._url(endpoint)
        try:
            resp = self.session.post(
                url,
                json=payload,
                headers=self._headers(),
                timeout=self.timeout,
                allow_redirects=False,
            )
            if resp.status_code in REDIRECT_STATUS_CODES and resp.headers.get("Location"):
                redirected_url = urljoin(url, resp.headers["Location"])
                resp = self.session.post(
                    redirected_url,
                    json=payload,
                    headers=self._headers(),
                    timeout=self.timeout,
                    allow_redirects=False,
                )

            try:
                data = resp.json() if resp.content else {}
            except ValueError:
                data = {"raw_text": resp.text}
            # Simplifica resposta
            return {
                "success": 200 <= resp.status_code < 300,
                "status_code": resp.status_code,
                "data": data,
            }
        except Exception as exc:
            logger.error(f"Evolution API error: {exc}")
            return {"success": False, "error": str(exc)}
