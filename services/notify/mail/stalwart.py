"""Cliente da API administrativa do Stalwart Mail Server.

O Stalwart Mail Server (v0.16+) expõe endpoints JMAP (RFC 8620/8621) e namespaces
administrativos (`urn:stalwart:jmap`, `x:Domain/*`, `x:Account/*`) sobre HTTP/HTTPS.

Escopo: gerenciamento e provisionamento de contas, domínios, senhas e aliases
para o notify-server.
"""

from __future__ import annotations

import secrets
import string
from typing import Any

import httpx
import structlog
from django.conf import settings

logger = structlog.get_logger()


class StalwartError(Exception):
    def __init__(self, msg: Any, *, type_: str = "error", details: Any = None):
        self.type = type_
        self.msg = msg
        self.details = details
        super().__init__(f"stalwart [{type_}]: {msg!r}")


class StalwartNotConfigured(StalwartError):
    def __init__(self):
        super().__init__("STALWART_BASE_URL/STALWART_ADMIN_USER ausentes", type_="config")


def generate_password(length: int = 24) -> str:
    """Senha forte para caixa de serviço (sem caracteres que quebram .env/SMTP)."""
    alphabet = string.ascii_letters + string.digits + "!@#%^*_-+="
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.isdigit() for c in pwd)
            and any(c.isupper() for c in pwd)
            and any(c.islower() for c in pwd)
        ):
            return pwd


class StalwartClient:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        user: str | None = None,
        password: str | None = None,
        verify: bool | None = None,
        timeout: float = 15.0,
    ) -> None:
        self._base_url = (
            base_url
            if base_url is not None
            else (getattr(settings, "STALWART_BASE_URL", "") or getattr(settings, "MAILCOW_BASE_URL", ""))
        ).rstrip("/")
        self._user = (
            user
            if user is not None
            else (getattr(settings, "STALWART_ADMIN_USER", "") or "")
        )
        self._password = (
            password
            if password is not None
            else (getattr(settings, "STALWART_ADMIN_PASSWORD", "") or "")
        )

        if not self._base_url or not self._user:
            raise StalwartNotConfigured()

        if verify is None:
            verify = bool(getattr(settings, "STALWART_VERIFY_TLS", False))

        self._client = httpx.Client(
            base_url=self._base_url,
            auth=(self._user, self._password) if self._password else None,
            headers={"Content-Type": "application/json"},
            timeout=timeout,
            verify=verify,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_a):
        self.close()

    # ── JMAP RPC ─────────────────────────────────────────────────────────────

    def jmap_call(self, method_calls: list[list[Any]], using: list[str] | None = None) -> dict[str, Any]:
        """Executa chamadas RPC contra o endpoint JMAP do Stalwart."""
        payload = {
            "using": using or ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
            "methodCalls": method_calls,
        }
        resp = self._client.post("/jmap/", json=payload)
        if resp.status_code == 401:
            raise StalwartError("Autenticação inválida no Stalwart", type_="unauthorized")
        if resp.status_code >= 400:
            raise StalwartError(resp.text[:300], type_=f"http_{resp.status_code}")

        try:
            data = resp.json()
        except ValueError as exc:
            raise StalwartError(resp.text[:300], type_="invalid_json") from exc

        return data

    def get_session(self) -> dict[str, Any]:
        """Consulta o discovery /jmap/session."""
        resp = self._client.get("/jmap/session")
        if resp.status_code == 401:
            raise StalwartError("Autenticação inválida no Stalwart", type_="unauthorized")
        if resp.status_code >= 400:
            raise StalwartError(resp.text[:300], type_=f"http_{resp.status_code}")
        try:
            return resp.json()
        except ValueError as exc:
            raise StalwartError(resp.text[:300], type_="invalid_json") from exc

    # ── Domínios & Contas ───────────────────────────────────────────────────

    def list_domains(self) -> list[str]:
        """Lista nomes de domínios configurados no Stalwart."""
        data = self.jmap_call([
            ["x:Domain/query", {"accountId": "b", "calculateTotal": True}, "q"],
            ["x:Domain/get", {"accountId": "b", "#ids": {"resultOf": "q", "name": "x:Domain/query", "path": "/ids"}}, "g"],
        ])
        method_responses = data.get("methodResponses", [])
        if len(method_responses) > 1 and method_responses[1][0] == "x:Domain/get":
            domain_list = method_responses[1][1].get("list", [])
            return [d.get("name") or d.get("domainName") or d.get("id") for d in domain_list if d]
        return []

    def get_domain_map(self) -> dict[str, str]:
        """Devolve mapeamento {nome_dominio: domain_id}."""
        data = self.jmap_call([
            ["x:Domain/query", {"accountId": "b", "calculateTotal": True}, "q"],
            ["x:Domain/get", {"accountId": "b", "#ids": {"resultOf": "q", "name": "x:Domain/query", "path": "/ids"}}, "g"],
        ])
        result = {}
        for call in data.get("methodResponses", []):
            if call[0] == "x:Domain/get":
                for item in call[1].get("list", []):
                    name = item.get("name") or item.get("domainName")
                    d_id = item.get("id")
                    if name and d_id:
                        result[name] = d_id
        return result

    def get_account(self, email: str) -> dict[str, Any] | None:
        """Busca conta pelo endereço de e-mail completo com filtro estrito de domínio."""
        parts = email.split("@")
        local_part = parts[0]
        domain = parts[1] if len(parts) > 1 else ""
        domain_map = self.get_domain_map()
        target_domain_id = domain_map.get(domain)

        data = self.jmap_call([
            ["x:Account/query", {"accountId": "b", "filter": {"name": local_part}}, "q"],
            ["x:Account/get", {"accountId": "b", "#ids": {"resultOf": "q", "name": "x:Account/query", "path": "/ids"}}, "g"],
        ])
        for call in data.get("methodResponses", []):
            if call[0] == "x:Account/get":
                for item in call[1].get("list", []):
                    item_email = item.get("emailAddress", "").lower()
                    if item_email == email.lower():
                        return item
                    if item.get("name") == local_part:
                        if target_domain_id and item.get("domainId") == target_domain_id:
                            return item
                        if not domain:
                            return item
        return None

    def list_mailboxes(self, domain: str | None = None) -> list[dict[str, Any]]:
        """Lista caixas/contas existentes no Stalwart, opcionalmente filtradas por domínio."""
        data = self.jmap_call([
            ["x:Account/query", {"accountId": "b", "calculateTotal": True}, "q"],
            ["x:Account/get", {"accountId": "b", "#ids": {"resultOf": "q", "name": "x:Account/query", "path": "/ids"}}, "g"],
        ])
        mailboxes = []
        for call in data.get("methodResponses", []):
            if call[0] == "x:Account/get":
                for item in call[1].get("list", []):
                    name = item.get("name") or ""
                    domain_id = item.get("domainId") or ""
                    email = item.get("emailAddress") or (f"{name}@{domain_id}" if domain_id else name)
                    if domain:
                        if not (domain_id.lower() == domain.lower() or email.lower().endswith(f"@{domain.lower()}")):
                            continue
                    mailboxes.append({
                        "username": email,
                        "local_part": name,
                        "domain": domain_id,
                        "name": item.get("description") or name,
                    })
        return mailboxes

    def ensure_mailbox(
        self,
        *,
        local_part: str,
        domain: str,
        name: str = "",
        password: str | None = None,
        rotate_password: bool = False,
    ) -> tuple[dict[str, Any], str | None, bool]:
        """Garante que a conta de e-mail exista no Stalwart.

        Retorna:
            (account_dict, senha_em_claro_se_criada_ou_rotacionada, foi_criada)
        """
        full_email = f"{local_part}@{domain}"
        domain_map = self.get_domain_map()
        domain_id = domain_map.get(domain)

        # Se não achou pelo nome exato, tenta achar domínio correspondente
        if not domain_id:
            domain_id = domain

        existing = self.get_account(full_email)

        if existing is not None and not rotate_password:
            # Conta já existe e não foi pedida rotação
            logger.info("stalwart.mailbox_reused", email=full_email)
            return existing, None, False

        pwd = password or generate_password()

        if existing is not None and rotate_password:
            # Atualiza credenciais da conta existente
            acc_id = existing["id"]
            update_payload = {
                "credentials": {
                    "0": {
                        "@type": "Password",
                        "secret": pwd,
                    }
                }
            }
            res = self.jmap_call([
                ["x:Account/set", {"accountId": "b", "update": {acc_id: update_payload}}, "u"]
            ])
            set_res = res.get("methodResponses", [[]])[0][1] if res.get("methodResponses") else {}
            if set_res.get("notUpdated"):
                err = set_res["notUpdated"].get(acc_id)
                raise StalwartError(f"Falha ao atualizar senha da conta {full_email}: {err}", details=err)

            logger.info("stalwart.mailbox_password_rotated", email=full_email)
            return existing, pwd, False

        # Criar nova conta
        create_payload = {
            "@type": "User",
            "name": local_part,
            "domainId": domain_id,
            "credentials": {
                "0": {
                    "@type": "Password",
                    "secret": pwd,
                }
            },
            "roles": {"@type": "User"},
            "permissions": {"@type": "Inherit"},
            "description": name or f"Notify account {local_part}",
            "locale": "pt_BR",
        }

        res = self.jmap_call([
            ["x:Account/set", {"accountId": "b", "create": {"new_acc": create_payload}}, "c"]
        ])
        set_res = res.get("methodResponses", [[]])[0][1] if res.get("methodResponses") else {}
        created_map = set_res.get("created", {})

        if not created_map or "new_acc" not in created_map:
            not_created = set_res.get("notCreated", {})
            err = not_created.get("new_acc")
            raise StalwartError(f"Falha ao criar conta {full_email} no Stalwart: {err}", details=err)

        created_acc = created_map["new_acc"]
        logger.info("stalwart.mailbox_created", email=full_email, id=created_acc.get("id"))
        return created_acc, pwd, True


def get_client() -> StalwartClient:
    return StalwartClient()
