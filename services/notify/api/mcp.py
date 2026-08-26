"""MCP do notify — o agente do app fala com o próprio canal.

Servido pelo mesmo Django, na mesma porta 80, em `POST /mcp`. Sem processo
extra, sem porta nova, sem deploy paralelo: dentro da VPN, o que sobra de
infraestrutura vira custo de manutenção sem ganho de segurança.

**Escopo é a API key.** A mesma `Authorization: Bearer <key>` da API v1 escolhe a
conta, e todas as ferramentas já nascem presas a ela — não existe parâmetro para
"mandar pela instância de outro app". Um agente com a key do app X não consegue
ler nem enviar pelo app Y.

Protocolo: JSON-RPC 2.0 sobre HTTP (o transporte "streamable HTTP" do MCP, sem
SSE — as chamadas aqui são curtas e a resposta cabe num POST).
"""

from __future__ import annotations

import json
from typing import Any, Literal

import structlog
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from pydantic import BaseModel, Field

from accounts.models import ApiKey

logger = structlog.get_logger()

PROTOCOL_VERSION = "2025-06-18"
SERVER_INFO = {"name": "notify", "version": "1.0.0"}


# ── Schemas de Ferramentas Pydantic v2 ──────────────────────────────────────

class McpSendIn(BaseModel):
    text: str = Field(..., description="Corpo da mensagem (markdown simples)")
    phone: str | None = Field(default=None, description="E.164 sem '+', ex.: 5542999999999")
    email: str | None = Field(default=None, description="E-mail de destino")
    subject: str | None = Field(default=None, description="Assunto do e-mail")
    title: str | None = Field(default=None, description="Título da mensagem")
    media_url: str | None = Field(default=None, description="URL pública ou da LAN para mídia")
    media_type: Literal["image", "video", "audio", "document"] | None = None
    external_id: str | None = Field(default=None, description="Chave de idempotência")
    caller: str = Field(default="mcp", description="Rótulo de origem para auditoria")
    account_id: str | None = Field(default=None, description="Slug/id da conta; ausente = conta default")


class McpSendEventIn(BaseModel):
    event: str = Field(..., description="Slug do evento cadastrado")
    phone: str | None = None
    email: str | None = None
    nome: str | None = None
    gender: Literal["M", "F"] | None = None
    ctx: dict[str, Any] = Field(default_factory=dict, description="Valores dos placeholders {chave}")
    idempotency_key: str | None = None
    account_id: str | None = None


class McpStatusIn(BaseModel):
    external_id: str = Field(..., description="external_id ou a chave de idempotência")
    account_id: str | None = None


class McpHistoryIn(BaseModel):
    caller: str | None = None
    status: Literal["pending", "sending", "sent", "failed", "skipped"] | None = None
    limit: int = Field(default=20, ge=1, le=100)
    account_id: str | None = None


class McpInboxIn(BaseModel):
    from_number: str | None = None
    limit: int = Field(default=20, ge=1, le=100)
    account_id: str | None = None


class McpPhoneCheckIn(BaseModel):
    numbers: list[str] = Field(..., min_length=1, description="Lista de números a verificar")
    account_id: str | None = None


class McpChannelsIn(BaseModel):
    account_id: str | None = None


class McpTemplatesIn(BaseModel):
    account_id: str | None = None


class McpTemplateUpsertIn(BaseModel):
    event: str = Field(..., description="Slug do evento")
    body_md: str = Field(..., description="Corpo do template")
    title: str | None = None
    subject: str | None = None
    channels: str = Field(default="whatsapp,email", description="csv: whatsapp,email")
    account_id: str | None = None


# ── Definições das ferramentas para tools/list ──────────────────────────────

TOOLS = [
    {
        "name": "notify_send",
        "description": (
            "Envia uma notificação pelos canais do app: WhatsApp (texto, mídia ou nota de voz) "
            "e e-mail. Informe ao menos phone ou email. Use external_id estável para não duplicar."
        ),
        "inputSchema": McpSendIn.model_json_schema() if hasattr(McpSendIn, "model_json_schema") else McpSendIn.schema(),
    },
    {
        "name": "notify_send_event",
        "description": "Envia usando um template cadastrado do app (evento), com contexto para os placeholders.",
        "inputSchema": McpSendEventIn.model_json_schema() if hasattr(McpSendEventIn, "model_json_schema") else McpSendEventIn.schema(),
    },
    {
        "name": "notify_status",
        "description": "Estado de uma notificação: por canal, entrega (enviado/entregue/lido) e erros.",
        "inputSchema": McpStatusIn.model_json_schema() if hasattr(McpStatusIn, "model_json_schema") else McpStatusIn.schema(),
    },
    {
        "name": "notify_history",
        "description": "Últimos envios do app, com filtro opcional por caller e status.",
        "inputSchema": McpHistoryIn.model_json_schema() if hasattr(McpHistoryIn, "model_json_schema") else McpHistoryIn.schema(),
    },
    {
        "name": "notify_inbox",
        "description": "Mensagens recebidas no número do app (o notify guarda para auditoria; o dono do histórico é o app).",
        "inputSchema": McpInboxIn.model_json_schema() if hasattr(McpInboxIn, "model_json_schema") else McpInboxIn.schema(),
    },
    {
        "name": "notify_phone_check",
        "description": (
            "Verifica se números existem no WhatsApp. exists:false é resposta final; "
            "erro de sessão é problema nosso e deve ser retentado depois."
        ),
        "inputSchema": McpPhoneCheckIn.model_json_schema() if hasattr(McpPhoneCheckIn, "model_json_schema") else McpPhoneCheckIn.schema(),
    },
    {
        "name": "notify_channels",
        "description": "O que este app tem pronto: instâncias de WhatsApp e cadeia de fallback, remetente de e-mail, vozes, webhook.",
        "inputSchema": McpChannelsIn.model_json_schema() if hasattr(McpChannelsIn, "model_json_schema") else McpChannelsIn.schema(),
    },
    {
        "name": "notify_templates",
        "description": "Lista os templates de evento do app (event, canais, corpo).",
        "inputSchema": McpTemplatesIn.model_json_schema() if hasattr(McpTemplatesIn, "model_json_schema") else McpTemplatesIn.schema(),
    },
    {
        "name": "notify_template_upsert",
        "description": "Cria ou edita um template de evento do app. Preserve os placeholders {chave} do corpo.",
        "inputSchema": McpTemplateUpsertIn.model_json_schema() if hasattr(McpTemplateUpsertIn, "model_json_schema") else McpTemplateUpsertIn.schema(),
    },
]


# ── execução ────────────────────────────────────────────────────────────────

def _tool_send(account, args: dict) -> dict:
    from notify.interface.send import send

    if not args.get("phone") and not args.get("email"):
        raise ValueError("informe phone ou email")
    ext = send(
        account=account,
        text=args["text"],
        caller=args.get("caller") or "mcp",
        phone=args.get("phone"),
        email=args.get("email"),
        title=args.get("title"),
        subject=args.get("subject"),
        whatsapp=bool(args.get("phone")),
        email_channel=bool(args.get("email")),
        media_url=args.get("media_url"),
        media_type=args.get("media_type"),
        gender=args.get("gender"),
        idempotency_key=args.get("external_id"),
    )
    return {"external_id": ext, "queued": True}


def _tool_send_event(account, args: dict) -> dict:
    from notify.interface.events import send_event

    ext = send_event(
        account,
        args["event"],
        phone=args.get("phone"),
        email=args.get("email"),
        nome=args.get("nome"),
        gender=args.get("gender"),
        ctx=args.get("ctx"),
        idempotency_key=args.get("idempotency_key"),
    )
    if ext is None:
        raise ValueError(f"evento '{args['event']}' não existe ou está inativo neste app")
    return {"external_id": ext, "queued": True}


def _notif_dict(n) -> dict:
    return {
        "external_id": str(n.external_id),
        "caller": n.caller,
        "to": n.recipient_phone or n.recipient_email,
        "whatsapp": n.whatsapp_status,
        "email": n.email_status,
        "delivery": n.delivery_status or None,
        "driver_used": n.driver_used or None,
        "attempts": n.attempts,
        "error": n.whatsapp_error or n.email_error,
        "created_at": n.created_at.isoformat(),
    }


def _tool_status(account, args: dict) -> dict:
    import uuid

    from django.db.models import Q

    from notify.models import Notification

    ident = args["external_id"]
    lookup = Q(idempotency_key=ident)
    try:
        lookup |= Q(external_id=uuid.UUID(ident))
    except (ValueError, AttributeError, TypeError):
        pass
    n = Notification.objects.filter(account=account).filter(lookup).first()
    if n is None:
        raise ValueError("notificação não encontrada neste app")
    return _notif_dict(n)


def _tool_history(account, args: dict) -> dict:
    from django.db.models import Q

    from notify.models import Notification

    qs = Notification.objects.filter(account=account).order_by("-created_at")
    if args.get("caller"):
        qs = qs.filter(caller=args["caller"])
    if args.get("status"):
        s = args["status"]
        qs = qs.filter(Q(whatsapp_status=s) | Q(email_status=s))
    limit = max(1, min(int(args.get("limit") or 20), 100))
    return {"items": [_notif_dict(n) for n in qs[:limit]]}


def _tool_inbox(account, args: dict) -> dict:
    from notify.models import InboundEvent

    qs = InboundEvent.objects.filter(account=account).order_by("-received_at")
    if args.get("from_number"):
        qs = qs.filter(from_number=args["from_number"])
    limit = max(1, min(int(args.get("limit") or 20), 100))
    return {
        "items": [
            {
                "from": e.from_number,
                "text": e.preview,
                "instance": e.instance_name,
                "wa_message_id": e.wa_message_id,
                "received_at": e.received_at.isoformat(),
            }
            for e in qs[:limit]
        ]
    }


def _tool_phone_check(account, args: dict) -> dict:
    from asgiref.sync import async_to_sync

    from channels.models import WhatsAppNumber
    from whatsapp.errors import WhatsAppSessionDown
    from whatsapp.factory import get_driver

    wn = (
        WhatsAppNumber.objects.filter(account=account, is_default=True).first()
        or WhatsAppNumber.objects.filter(account=account).first()
    )

    async def _check():
        async with get_driver(wn) as wa:
            return await wa.check_numbers(args["numbers"])

    try:
        results = async_to_sync(_check)()
    except WhatsAppSessionDown as exc:
        raise ValueError(
            "whatsapp_session_down: o verificador está fora. Isto NÃO significa que o número "
            "não tem WhatsApp — tente de novo mais tarde."
        ) from exc
    return {
        "items": [
            {"number": i.get("number", ""), "exists": bool(i.get("exists"))} for i in results or []
        ]
    }


def _tool_channels(account, _args: dict) -> dict:
    from channels.models import AppWebhook, MailIdentity, WhatsAppNumber

    hook = AppWebhook.objects.filter(account=account).first()
    return {
        "app": account.slug,
        "whatsapp": [
            {
                "instance": n.instance_name,
                "phone": n.phone_number,
                "chain": n.driver_chain,
                "default": n.is_default,
                "connection_status": n.connection_status,
            }
            for n in WhatsAppNumber.objects.filter(account=account)
        ],
        "email": [
            {"from": m.from_email, "name": m.from_name, "default": m.is_default}
            for m in MailIdentity.objects.filter(account=account)
        ],
        "sms": {"available": False, "reason": "sem gateway; envios saem como skipped"},
        "webhook": {"url": hook.url, "events": hook.event_list} if hook else None,
    }


def _tool_templates(account, _args: dict) -> dict:
    from notify.models import Template

    return {
        "items": [
            {
                "event": t.event,
                "channels": t.channel_list,
                "title": t.title,
                "subject": t.subject,
                "body_md": t.body_md,
            }
            for t in Template.objects.filter(account=account).order_by("event")
        ]
    }


def _tool_template_upsert(account, args: dict) -> dict:
    from notify.interface import templates as _cache
    from notify.models import Template

    t, created = Template.objects.update_or_create(
        account=account,
        event=args["event"],
        defaults={
            "body_md": args["body_md"],
            "title": args.get("title"),
            "subject": args.get("subject"),
            "channels": args.get("channels") or "whatsapp,email",
        },
    )
    _cache.invalidate(account.id, t.event)
    return {"event": t.event, "created": created}


_HANDLERS = {
    "notify_send": _tool_send,
    "notify_send_event": _tool_send_event,
    "notify_status": _tool_status,
    "notify_history": _tool_history,
    "notify_inbox": _tool_inbox,
    "notify_phone_check": _tool_phone_check,
    "notify_channels": _tool_channels,
    "notify_templates": _tool_templates,
    "notify_template_upsert": _tool_template_upsert,
}


# ── transporte JSON-RPC ─────────────────────────────────────────────────────

def _account_from(request, args: dict | None = None):
    """Conta do MCP — mesmo modelo sem key do resto do serviço (VPN-only).

    Ordem: Bearer válido (compat) → `account_id` nos arguments da tool →
    conta default. Devolve (account, None) ou (None, mensagem_de_erro).
    """
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        row = (
            ApiKey.objects.select_related("account")
            .filter(key_hash=ApiKey.hash_key(auth[7:]), is_active=True, account__is_active=True)
            .first()
        )
        if row:
            return row.account, None

    from django.conf import settings

    from accounts.models import Account

    account_id = str((args or {}).get("account_id") or "").strip()
    slug = account_id or getattr(settings, "NOTIFY_DEFAULT_ACCOUNT_SLUG", "default")
    lookup = {"pk": int(slug)} if slug.isdigit() else {"slug": slug}
    account = Account.objects.filter(**lookup).first()
    if account is None:
        return None, f"conta '{slug}' não existe (informe account_id ou crie a conta default)"
    if not account.is_active:
        return None, f"conta '{account.slug}' está desativada"
    return account, None


def _result(req_id, payload):
    return {"jsonrpc": "2.0", "id": req_id, "result": payload}


def _error(req_id, code, message):
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _text_content(data) -> dict:
    return {"content": [{"type": "text", "text": json.dumps(data, ensure_ascii=False, indent=2)}]}


@csrf_exempt
def endpoint(request):
    """POST /mcp — JSON-RPC 2.0."""
    if request.method == "GET":
        # Sem SSE: dizer isso é mais honesto do que abrir um stream que não emite.
        return JsonResponse(
            {"error": "este servidor MCP usa POST JSON-RPC; SSE não é suportado"}, status=405
        )
    if request.method != "POST":
        return JsonResponse({"error": "method not allowed"}, status=405)

    try:
        body = json.loads(request.body or b"{}")
    except ValueError:
        return JsonResponse(_error(None, -32700, "JSON inválido"), status=400)

    req_id = body.get("id")
    method = body.get("method") or ""
    params = body.get("params") or {}

    if method == "initialize":
        return JsonResponse(
            _result(
                req_id,
                {
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": {"tools": {"listChanged": False}},
                    "serverInfo": SERVER_INFO,
                    "instructions": (
                        "Canal de notificação do app (VPN, sem chave). Passe account_id nos "
                        "arguments para escolher a conta; sem account_id, vale a conta default. "
                        "Use external_id estável para não duplicar entrega."
                    ),
                },
            )
        )
    if method in {"notifications/initialized", "notifications/cancelled"}:
        return JsonResponse({}, status=202)
    if method == "ping":
        return JsonResponse(_result(req_id, {}))

    if method == "tools/list":
        return JsonResponse(_result(req_id, {"tools": TOOLS}))

    if method == "tools/call":
        name = params.get("name") or ""
        args = params.get("arguments") or {}
        account, motivo = _account_from(request, args)
        if account is None:
            return JsonResponse(_error(req_id, -32001, motivo), status=404)
        handler = _HANDLERS.get(name)
        if handler is None:
            return JsonResponse(_error(req_id, -32602, f"ferramenta desconhecida: {name}"))
        try:
            data = handler(account, args)
        except KeyError as exc:
            return JsonResponse(
                _result(req_id, {**_text_content({"error": f"parâmetro obrigatório ausente: {exc}"}), "isError": True})
            )
        except Exception as exc:  # noqa: BLE001 — erro de ferramenta volta como resultado, não como falha de protocolo
            logger.warning("mcp.tool_error", tool=name, error=str(exc)[:200], account=account.slug)
            return JsonResponse(
                _result(req_id, {**_text_content({"error": f"{type(exc).__name__}: {exc}"}), "isError": True})
            )
        logger.info("mcp.tool_ok", tool=name, account=account.slug)
        return JsonResponse(_result(req_id, _text_content(data)))

    return JsonResponse(_error(req_id, -32601, f"método não suportado: {method}"))
