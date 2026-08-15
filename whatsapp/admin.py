"""Admin client da Evolution API v2 — usado pelo pairing (sem instance_name).

O `EvolutionV2Driver` (em evolution_v2.py) é por-instância: precisa de um
WhatsAppNumber já cadastrado. Este aqui é pra fase de bootstrap: lista/cria/
conecta/desconecta instâncias. Vive só no controlpanel.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


class EvolutionAdminError(Exception):
    """Falha de comunicação com a Evolution API v2."""


class EvolutionAdminClient:
    """Wrapper minimal sobre a Evolution API v2 (apenas endpoints de pairing)."""

    def __init__(self, base_url: str | None = None, api_key: str | None = None, timeout: float = 10.0):
        self._base_url = (base_url or getattr(settings, "WHATSAPP_API_BASE_URL", "") or "").rstrip("/")
        self._api_key = api_key or getattr(settings, "WHATSAPP_GLOBAL_API_KEY", "") or ""
        self._timeout = timeout

    @property
    def is_configured(self) -> bool:
        return bool(self._base_url) and bool(self._api_key)

    def _headers(self) -> dict[str, str]:
        return {"apikey": self._api_key, "Content-Type": "application/json"}

    def _request(self, method: str, path: str, **kwargs) -> Any:
        if not self.is_configured:
            raise EvolutionAdminError(
                "Evolution v2 não configurada. Defina WHATSAPP_API_BASE_URL e "
                "WHATSAPP_GLOBAL_API_KEY no .env e reinicie o servidor."
            )
        url = f"{self._base_url}{path}"
        try:
            resp = httpx.request(method, url, headers=self._headers(), timeout=self._timeout, **kwargs)
        except httpx.HTTPError as exc:
            raise EvolutionAdminError(f"Falha de rede: {type(exc).__name__}: {exc}") from exc
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise EvolutionAdminError(
                f"Evolution v2 respondeu {resp.status_code}: {resp.text[:200]}"
            ) from exc
        try:
            return resp.json()
        except ValueError:
            return None

    def list_instances(self) -> list[dict[str, Any]]:
        return self._request("GET", "/instance/fetchInstances") or []

    def create_instance(self, name: str, phone: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "instanceName": name,
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS",
        }
        if phone:
            payload["number"] = phone
        return self._request("POST", "/instance/create", json=payload) or {}

    def get_connect_qr(self, name: str) -> tuple[str | None, str]:
        """Retorna (qr_png_base64_puro_ou_None, connection_state).

        A Evolution v2 já vem com prefixo `data:image/png;base64,` no campo
        `base64` — strip aqui pra que o template monte a src sem duplicar.
        """
        data = self._request("GET", f"/instance/connect/{name}") or {}
        qr_obj = data.get("base64") if isinstance(data, dict) else None
        if isinstance(qr_obj, str) and qr_obj:
            qr = qr_obj.split(",", 1)[1] if qr_obj.startswith("data:") else qr_obj
        else:
            qr = None
        state = data.get("instance", {}).get("state", "unknown") if isinstance(data, dict) else "unknown"
        return qr, state

    def get_connection_state(self, name: str) -> str:
        data = self._request("GET", f"/instance/connectionState/{name}") or {}
        if isinstance(data, dict):
            inst = data.get("instance") or data
            if isinstance(inst, dict):
                return str(inst.get("state", "unknown"))
        return "unknown"

    def logout(self, name: str) -> Any:
        return self._request("DELETE", f"/instance/logout/{name}")

    def delete_instance(self, name: str) -> Any:
        return self._request("DELETE", f"/instance/delete/{name}")
