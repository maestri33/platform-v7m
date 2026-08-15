"""Cliente da API administrativa do mailcow.

ARMADILHA CENTRAL: o mailcow responde **HTTP 200 mesmo quando falha**. O erro
vem no corpo, como `[{"type":"danger","msg":"access_denied"}]`. Quem confia no
status code acha que criou a caixa e só descobre o contrário quando o e-mail não
sai. Por isso todo POST aqui passa por `_check`.

Escopo: só o que o provisionamento de um app precisa — domínios, caixas, senha e
alias. Nada de fila, spam ou backup; isso continua no painel.
"""

from __future__ import annotations

import secrets
import string
from typing import Any

import httpx
import structlog
from django.conf import settings

logger = structlog.get_logger()

_OK_TYPES = {"success", "info"}


class MailcowError(Exception):
    def __init__(self, msg: Any, *, type_: str = "danger", log: Any = None):
        self.type = type_
        self.msg = msg
        self.log = log
        super().__init__(f"mailcow [{type_}]: {msg!r}")


class MailcowNotConfigured(MailcowError):
    def __init__(self):
        super().__init__("MAILCOW_BASE_URL/MAILCOW_API_KEY ausentes", type_="config")


def generate_password(length: int = 24) -> str:
    """Senha forte para caixa de serviço (sem caracteres que quebram .env/SMTP)."""
    alphabet = string.ascii_letters + string.digits + "!@#%^*_-+="
    return "".join(secrets.choice(alphabet) for _ in range(length))


class MailcowClient:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        verify: bool | None = None,
        timeout: float = 20.0,
    ) -> None:
        self._base_url = (base_url or getattr(settings, "MAILCOW_BASE_URL", "")).rstrip("/")
        self._api_key = api_key or getattr(settings, "MAILCOW_API_KEY", "")
        if not self._base_url or not self._api_key:
            raise MailcowNotConfigured()
        if verify is None:
            verify = bool(getattr(settings, "MAILCOW_VERIFY_TLS", False))
        self._client = httpx.Client(
            base_url=self._base_url,
            headers={"X-API-Key": self._api_key, "Content-Type": "application/json"},
            timeout=timeout,
            verify=verify,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_a):
        self.close()

    # ── transporte ──────────────────────────────────────────────────────────

    @staticmethod
    def _check(data: Any) -> Any:
        """Traduz o corpo do mailcow em sucesso ou exceção."""
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            kind = str(item.get("type", "")).lower()
            if kind and kind not in _OK_TYPES:
                raise MailcowError(item.get("msg"), type_=kind, log=item.get("log"))
        return data

    def _post(self, path: str, payload: Any) -> Any:
        resp = self._client.post(path, json=payload)
        if resp.status_code >= 400:
            raise MailcowError(resp.text[:300], type_=f"http_{resp.status_code}")
        try:
            return self._check(resp.json())
        except ValueError as exc:
            raise MailcowError(resp.text[:300], type_="nao_json") from exc

    def _get(self, path: str) -> Any:
        resp = self._client.get(path)
        if resp.status_code >= 400:
            raise MailcowError(resp.text[:300], type_=f"http_{resp.status_code}")
        try:
            return resp.json()
        except ValueError as exc:
            raise MailcowError(resp.text[:300], type_="nao_json") from exc

    # ── domínios ────────────────────────────────────────────────────────────

    def list_domains(self) -> list[str]:
        data = self._get("/api/v1/get/domain/all")
        return [d["domain_name"] for d in data if isinstance(d, dict) and d.get("domain_name")]

    # ── caixas ──────────────────────────────────────────────────────────────

    def list_mailboxes(self, domain: str | None = None) -> list[dict]:
        # Atenção ao caminho: `/get/mailbox/{x}` trata x como USERNAME e devolve
        # {} para um domínio. Filtrar por domínio é `/get/mailbox/all/{domínio}`.
        path = f"/api/v1/get/mailbox/all/{domain}" if domain else "/api/v1/get/mailbox/all"
        data = self._get(path)
        return [m for m in data if isinstance(m, dict)] if isinstance(data, list) else []

    def get_mailbox(self, username: str) -> dict | None:
        data = self._get(f"/api/v1/get/mailbox/{username}")
        if isinstance(data, dict) and data.get("username"):
            return data
        if isinstance(data, list) and data and isinstance(data[0], dict) and data[0].get("username"):
            return data[0]
        return None

    def create_mailbox(
        self,
        *,
        local_part: str,
        domain: str,
        password: str,
        name: str = "",
        quota_mb: int | None = None,
        active: bool = True,
    ) -> dict:
        quota_mb = quota_mb or int(getattr(settings, "MAILCOW_DEFAULT_QUOTA_MB", 1024))
        payload = {
            "local_part": local_part,
            "domain": domain,
            "name": name or local_part,
            "quota": str(quota_mb),
            "password": password,
            "password2": password,
            "active": "1" if active else "0",
            "force_pw_update": "0",
            "tls_enforce_in": "1",
            "tls_enforce_out": "1",
        }
        self._post("/api/v1/add/mailbox", payload)
        logger.info("mailcow.mailbox_created", username=f"{local_part}@{domain}")
        return self.get_mailbox(f"{local_part}@{domain}") or {}

    def update_mailbox(self, username: str, **attrs: Any) -> Any:
        return self._post("/api/v1/edit/mailbox", {"items": [username], "attr": attrs})

    def set_password(self, username: str, password: str) -> Any:
        result = self.update_mailbox(username, password=password, password2=password)
        logger.info("mailcow.password_set", username=username)
        return result

    def set_active(self, username: str, active: bool) -> Any:
        return self.update_mailbox(username, active="1" if active else "0")

    def delete_mailbox(self, username: str) -> Any:
        """Destrutivo — o provisionamento nunca chama isto; existe para operação manual."""
        return self._post("/api/v1/delete/mailbox", [username])

    # ── alias ───────────────────────────────────────────────────────────────

    def create_alias(self, address: str, goto: str, *, active: bool = True) -> Any:
        return self._post(
            "/api/v1/add/alias",
            {"address": address, "goto": goto, "active": "1" if active else "0"},
        )

    # ── idempotência ────────────────────────────────────────────────────────

    def ensure_mailbox(
        self,
        *,
        local_part: str,
        domain: str,
        name: str = "",
        password: str | None = None,
        quota_mb: int | None = None,
        rotate_password: bool = False,
    ) -> tuple[dict, str | None, bool]:
        """Garante a caixa. Devolve (mailbox, senha_em_claro_ou_None, criada?).

        A senha só volta em claro quando esta chamada a definiu — o mailcow não
        devolve senha existente. Reprovisionar sem `rotate_password` preserva a
        senha atual, para não invalidar o SMTP de um app que já está rodando.
        """
        username = f"{local_part}@{domain}"
        existing = self.get_mailbox(username)

        if existing is None:
            raw = password or generate_password()
            mailbox = self.create_mailbox(
                local_part=local_part, domain=domain, password=raw, name=name, quota_mb=quota_mb
            )
            return mailbox, raw, True

        if rotate_password or password:
            raw = password or generate_password()
            self.set_password(username, raw)
            return self.get_mailbox(username) or existing, raw, False

        logger.info("mailcow.mailbox_reused", username=username)
        return existing, None, False


def get_client() -> MailcowClient:
    return MailcowClient()
