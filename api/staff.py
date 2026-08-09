"""Staff API — CRUD templates, adhoc, preview, stats, seed. Auth por api-key admin."""

from __future__ import annotations

from ninja import ModelSchema, Router, Schema
from ninja.errors import HttpError

from accounts.auth import api_key_auth
from notify.models import Template

router = Router(tags=["staff"], auth=api_key_auth)


# ── Adhoc send ──────────────────────────────────────────────────────────────

class StaffNotifyIn(Schema):
    phone: str | None = None
    email: str | None = None
    subject: str | None = None
    message: str
    channels: list[str] | None = None


@router.post("/adhoc")
def staff_adhoc(request, payload: StaffNotifyIn):
    account = request.auth
    from notify.interface.send import send_adhoc

    try:
        ext = send_adhoc(
            account=account,
            message=payload.message,
            phone=payload.phone,
            email=payload.email,
            subject=payload.subject,
            channels=payload.channels,
            caller="staff.adhoc",
        )
    except ValueError as exc:
        raise HttpError(400, str(exc))
    return {"external_id": ext}


# ── Template CRUD ───────────────────────────────────────────────────────────

class TemplateState(Schema):
    active: bool


class TemplateOut(ModelSchema):
    class Meta:
        model = Template
        fields = [
            "external_id", "updated_at", "event", "title", "subject", "body_md", "is_tts", "active", "channels",
            "media_url", "media_type", "mail_template", "notes",
        ]


class TemplateUpsertIn(Schema):
    title: str | None = None
    subject: str | None = None
    body_md: str
    is_tts: bool = False
    channels: str = "whatsapp,email"
    media_url: str | None = None
    media_type: str | None = None
    mail_template: str = "default"
    notes: str | None = None


class TemplateStateIn(Schema):
    active: bool = True


_VALID_CHANNELS = {"whatsapp", "email", "tts"}


def _validate_channels(raw: str) -> str:
    parts = [p.strip() for p in (raw or "").split(",") if p.strip()]
    bad = [p for p in parts if p not in _VALID_CHANNELS]
    if bad:
        raise HttpError(400, f"canais inválidos: {bad}")
    return ",".join(parts) if parts else "whatsapp,email"


@router.get("/templates", response=list[TemplateOut])
def list_templates(request, account_slug: str | None = None):
    from accounts.models import Account

    if account_slug:
        acc = Account.objects.filter(slug=account_slug).first()
        if not acc:
            raise HttpError(404, f"Conta '{account_slug}' não encontrada.")
        qs = Template.objects.filter(account=acc)
    else:
        qs = Template.objects.all()
    return qs.order_by("account", "event")


@router.get("/templates/stats")
def template_stats(request, account_slug: str | None = None):
    from accounts.models import Account

    qs = Template.objects.all()
    if account_slug:
        acc = Account.objects.filter(slug=account_slug).first()
        if acc:
            qs = qs.filter(account=acc)

    total = qs.count()
    with_tts = qs.filter(is_tts=True).count()
    return {"total": total, "with_tts": with_tts}


@router.get("/templates/{account_slug}/{event}", response=TemplateOut)
def get_template(request, account_slug: str, event: str):
    from accounts.models import Account

    acc = Account.objects.filter(slug=account_slug).first()
    if not acc:
        raise HttpError(404, f"Conta '{account_slug}' não encontrada.")
    t = Template.objects.filter(account=acc, event=event).first()
    if t is None:
        raise HttpError(404, "Template não encontrado.")
    return t


@router.put("/templates/{account_slug}/{event}", response=TemplateOut)
def upsert_template(request, account_slug: str, event: str, payload: TemplateUpsertIn):
    from accounts.models import Account

    acc = Account.objects.filter(slug=account_slug).first()
    if not acc:
        raise HttpError(404, f"Conta '{account_slug}' não encontrada.")
    if not payload.body_md.strip():
        raise HttpError(400, "body_md não pode ser vazio.")
    channels = _validate_channels(payload.channels)

    t, _ = Template.objects.update_or_create(
        account=acc, event=event,
        defaults=dict(
            title=payload.title, subject=payload.subject, body_md=payload.body_md,
            is_tts=payload.is_tts,
            channels=channels, media_url=payload.media_url, media_type=payload.media_type,
            mail_template=payload.mail_template or "default", notes=payload.notes,
        ),
    )
    return t


@router.put("/templates/{account_slug}/{event}/active", response=TemplateState)
@router.put("/templates/{account_slug}/{event}/trigger", response=TemplateState)
def set_template_active(request, account_slug: str, event: str, payload: TemplateStateIn):
    from accounts.models import Account

    acc = Account.objects.filter(slug=account_slug).first()
    if not acc:
        raise HttpError(404, f"Conta '{account_slug}' não encontrada.")
    t = Template.objects.filter(account=acc, event=event).first()
    if t is None:
        raise HttpError(404, "Template não encontrado.")

    t.active = payload.active
    t.save(update_fields=["active", "updated_at"])
    return TemplateState(active=t.active)


@router.delete("/templates/{account_slug}/{event}")
def delete_template(request, account_slug: str, event: str):
    from accounts.models import Account

    acc = Account.objects.filter(slug=account_slug).first()
    if not acc:
        raise HttpError(404, f"Conta '{account_slug}' não encontrada.")
    t = Template.objects.filter(account=acc, event=event).first()
    if t is None:
        raise HttpError(404, "Template não encontrado.")
    t.delete()
    return {"deleted": event}


# ── Preview ─────────────────────────────────────────────────────────────────

class PreviewIn(Schema):
    ctx: dict | None = None


class PreviewOut(Schema):
    event: str
    body_md: str
    rendered: str
    is_tts: bool
    channels: list[str]


@router.post("/templates/{account_slug}/{event}/preview", response=PreviewOut)
def preview_template(request, account_slug: str, event: str, payload: PreviewIn):
    from accounts.models import Account
    from notify.interface import templates

    acc = Account.objects.filter(slug=account_slug).first()
    if not acc:
        raise HttpError(404, f"Conta '{account_slug}' não encontrada.")
    data = templates.get(acc.id, event)
    if data is None:
        raise HttpError(404, "Template não encontrado.")
    ctx = {"nome": "tudo bem", "nome_completo": "tudo bem", "name": "tudo bem"}
    if payload.ctx:
        ctx.update(payload.ctx)
    rendered = templates.render(data.body_md, ctx)
    return PreviewOut(
        event=event, body_md=data.body_md, rendered=rendered,
        is_tts=data.is_tts, channels=data.channel_list,
    )
