"""Grupo `tools` — ferramentas internas de integração (radar de leads + gatilho de notificação).

🔒 **AUTH DE SERVIÇO + IP** (hardening 2026-07-10): as rotas de negócio exigem DUAS provas,
ambas fail-closed:

1. `service_secret_auth` (callable Ninja → 401 se falhar): o mesmo segredo de serviço dos webhooks
   (`core/webhook_auth.py::service_secret_ok`, header `settings.BOT_SERVICE_HEADER`). É a prova de
   IDENTIDADE — sem ele, mesmo de um IP interno a rota 401a. `BOT_SERVICE_SECRET` vazio no .env =>
   sempre 401 (fail-closed).
2. `require_internal_ip` (403 se o IP não estiver na allowlist DMZ): defesa em profundidade de REDE.

Antes só havia o gate de IP (`auth=None`) — qualquer host dentro da DMZ lia nome/telefone dos leads
e disparava WhatsApp/e-mail. `caller="tools.send"` fica auditável no histórico do notify.

Casca fina (CONVENTION §3): valida a borda e chama `lead`/`notify` in-process. Erros de domínio
borbulham pro handler central da fábrica (`api/base.py`) → `{detail, code, …extra}`.
"""

from __future__ import annotations

from datetime import datetime

from ninja import Schema

from api.base import COMMON_ERROR_REGISTRY, build_group
from core.net import require_internal_ip
from core.webhook_auth import service_secret_ok
from users.exceptions import ValidationError
from users.roles.lead import service as lead_iface
from users.roles.lead.models import Lead


def service_secret_auth(request):
    """Auth callable do Ninja: exige o segredo de serviço interno (mesmo dos webhooks/bot login).

    Truthy => vira `request.auth`; None => Ninja levanta `AuthenticationError` → 401 padronizado
    (`api/base.py`). Fail-closed: `BOT_SERVICE_SECRET` vazio no .env => `service_secret_ok` False =>
    401. É a auth REAL exigida ALÉM do gate de IP (`require_internal_ip`) nas rotas abaixo."""
    return True if service_secret_ok(request) else None


_ERROR_REGISTRY = (
    COMMON_ERROR_REGISTRY
    + """
### Códigos específicos de tools (serviços externos)

| code | quando | extras |
|---|---|---|
| `UNAUTHORIZED` | sem o segredo de serviço no header (401) | — |
| `INVALID_STATUS` | `status` fora de pending/paid/failed (422) | — |
| `DATE_INVALID` | `created_after` não é ISO-8601 (422) | — |
"""
)

api = build_group(
    "tools",
    "Ferramentas internas de integração — radar de leads + disparo de notificação. "
    "Rotas de negócio exigem segredo de serviço (header) ALÉM de IP interno (DMZ).\n"
    + _ERROR_REGISTRY,
)

_MAX_LIMIT = 500


class ToolLeadOut(Schema):
    """Linha do radar de leads (mesmo shape da listagem staff/hub)."""

    external_id: str
    status: str
    name: str | None = None
    phone: str | None = None
    promoter_external_id: str
    payment_link: str | None = None
    receipt_url: str | None = None
    created_at: str


@api.get("/leads", response=list[ToolLeadOut], auth=service_secret_auth, tags=["tools"])
def tools_leads(
    request,
    status: str | None = None,
    created_after: str | None = None,
    limit: int = 100,
):
    """Radar de leads: todos os leads (mais novos primeiro), com nome/telefone/link de pagamento.

    Filtros: `status` (pending/paid/failed), `created_after` (ISO-8601), `limit` (1..500, default 100)."""
    require_internal_ip(request)
    if status and status not in Lead.Status.values:
        raise ValidationError(
            f"Status inválido: {status} (use {'/'.join(Lead.Status.values)}).",
            code="INVALID_STATUS",
        )
    parsed_after = None
    if created_after:
        try:
            parsed_after = datetime.fromisoformat(created_after)
        except ValueError as exc:
            raise ValidationError(
                "created_after inválido (use ISO-8601, ex.: 2026-07-01 ou 2026-07-01T12:00:00-03:00).",
                code="DATE_INVALID",
            ) from exc
    limit = max(1, min(limit, _MAX_LIMIT))
    rows = lead_iface.list_leads(
        hub=None, status=status, created_after=parsed_after, limit=limit
    )
    return [lead_iface.lead_to_dict(lead) for lead in rows]


class ToolsNotifyIn(Schema):
    """Aceita usuário cadastrado ou destino livre para envio pelo notify-server."""

    user_external_id: str | None = None
    phone: str | None = None
    email: str | None = None
    subject: str | None = None
    message: str
    channels: list[str] | None = None  # subconjunto de {"whatsapp","email"}


class ToolsNotifySentOut(Schema):
    external_id: str


@api.post(
    "/notifications/send",
    response=ToolsNotifySentOut,
    auth=service_secret_auth,
    tags=["tools"],
)
def tools_notifications_send(request, payload: ToolsNotifyIn):
    """Gatilho de disparo: envia WhatsApp e/ou e-mail a um USUÁRIO (`user_external_id`, herda
    phone/email do Profile) OU a um destino LIVRE (`phone`/`email`). `channels` opcional (default:
    todos com destino). Devolve o `external_id` da notificação enfileirada (audit no notify)."""
    require_internal_ip(request)

    from notify.interface.send import send_adhoc

    external_id = send_adhoc(
        message=payload.message,
        to_user=payload.user_external_id,
        phone=payload.phone,
        email=payload.email,
        subject=payload.subject,
        channels=payload.channels,
        caller="tools.send",
    )
    return {"external_id": external_id}
