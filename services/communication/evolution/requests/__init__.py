"""Cliente base HTTP para chamadas da Evolution API."""

import requests
from django.conf import settings
from urllib.parse import urljoin

REDIRECT_STATUS_CODES = {301, 302, 307, 308}


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

    def _request(self, method, path, payload=None):
        """Executa request HTTP preservando método em redirects de proxy."""

        url = f"{self.base_url}/{path.lstrip('/')}"
        response = self.session.request(
            method=method,
            url=url,
            json=payload,
            headers=self._headers(),
            timeout=self.timeout,
            allow_redirects=False,
        )

        if response.status_code in REDIRECT_STATUS_CODES and response.headers.get("Location"):
            redirected_url = urljoin(url, response.headers["Location"])
            response = self.session.request(
                method=method,
                url=redirected_url,
                json=payload,
                headers=self._headers(),
                timeout=self.timeout,
                allow_redirects=False,
            )

        return self._normalize_response(response)

    def post(self, path, payload):
        """Executa POST em endpoint relativo e retorna JSON com status."""

        return self._request("POST", path, payload)

    def get(self, path, params=None):
        """Executa GET em endpoint relativo e retorna JSON com status."""

        url = f"{self.base_url}/{path.lstrip('/')}"
        response = self.session.get(
            url,
            params=params,
            headers=self._headers(),
            timeout=self.timeout,
            allow_redirects=False,
        )
        if response.status_code in REDIRECT_STATUS_CODES and response.headers.get("Location"):
            redirected_url = urljoin(url, response.headers["Location"])
            response = self.session.get(
                redirected_url,
                params=params,
                headers=self._headers(),
                timeout=self.timeout,
                allow_redirects=False,
            )
        return self._normalize_response(response)
