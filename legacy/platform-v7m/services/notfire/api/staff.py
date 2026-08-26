"""Staff API — CRUD templates, adhoc, preview, stats, seed. Auth por api-key admin."""

from __future__ import annotations

from ninja import Router, Schema
from ninja.errors import HttpError

from accounts.auth import api_key_auth

router = Router(tags=["staff"])


def _require_admin(request):
    """Api-key de admin = conta com slug 'admin' ou flag is_staff no future."""
    account = api_key_auth(request)
    # ponytail: por enquanto, qualquer api-key válida é admin (serviço interno, VPN-only)
    return account


# ── Adhoc send ──────────────────────────────────────────────────────────────

class StaffNotifyIn(Schema):
    phone: str | None = None
    email: str | None = None
    subject: str | None = None
    message: str
    channels: list[str] | None = None


@router.post("/adhoc")
def staff_adhoc(request, payload: StaffNotifyIn):
    account = _require_admin(request)
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

class TriggerOut(Schema):
    fires_on: str
    source: str | None
    delay_minutes: int
    active: bool


class TemplateOut(Schema):
    event: str
    external_id: str
    title: str | None
    subject: str | None
    body_md: str
    is_tts: bool
    storytelling: bool
    story_prompt: str | None
    channels: str
    media_url: str | None
    media_type: str | None
    mail_template: str
    notes: str | None
    updated_at: str
    trigger: TriggerOut | None


class TemplateUpsertIn(Schema):
    title: str | None = None
    subject: str | None = None
    body_md: str
    is_tts: bool = False
    storytelling: bool = False
    story_prompt: str | None = None
    channels: str = "whatsapp,email"
    media_url: str | None = None
    media_type: str | None = None
    mail_template: str = "default"
    notes: str | None = None


class TriggerUpsertIn(Schema):
    fires_on: str = ""
    source: str | None = None
    delay_minutes: int = 0
    active: bool = True


_VALID_CHANNELS = {"whatsapp", "email", "tts"}
_VALID_MEDIA = {"image", "video", "audio", "document"}


def _validate_channels(raw: str) -> str:
    parts = [p.strip() for p in (raw or "").split(",") if p.strip()]
    bad = [p for p in parts if p not in _VALID_CHANNELS]
    if bad:
        raise HttpError(400, f"canais inválidos: {bad}")
    return ",".join(parts) if parts else "whatsapp,email"


def _trigger_out(t) -> TriggerOut | None:
    if t is None:
        return None
    return TriggerOut(fires_on=t.fires_on or "", source=t.source or None, delay_minutes=t.delay_minutes, active=t.active)


def _template_out(t) -> TemplateOut:
    from notify.models import Trigger
    tr = Trigger.objects.filter(template=t).first()
    return TemplateOut(
        event=t.event, external_id=str(t.external_id), title=t.title, subject=t.subject,
        body_md=t.body_md, is_tts=t.is_tts, storytelling=t.storytelling, story_prompt=t.story_prompt,
        channels=t.channels, media_url=t.media_url, media_type=t.media_type, mail_template=t.mail_template,
        notes=t.notes, updated_at=t.updated_at.isoformat(), trigger=_trigger_out(tr),
    )


@router.get("/templates", response=list[TemplateOut])
def list_templates(request, account_slug: str | None = None):
    _require_admin(request)
    from accounts.models import Account
    from notify.models import Template

    if account_slug:
        acc = Account.objects.filter(slug=account_slug).first()
        if not acc:
            raise HttpError(404, f"Conta '{account_slug}' não encontrada.")
        qs = Template.objects.filter(account=acc)
    else:
        qs = Template.objects.all()
    return [_template_out(t) for t in qs.order_by("account", "event")]


@router.get("/templates/stats")
def template_stats(request, account_slug: str | None = None):
    _require_admin(request)
    from accounts.models import Account
    from notify.models import Template

    qs = Template.objects.all()
    if account_slug:
        acc = Account.objects.filter(slug=account_slug).first()
        if acc:
            qs = qs.filter(account=acc)

    total = qs.count()
    with_tts = qs.filter(is_tts=True).count()
    with_story = qs.filter(storytelling=True).count()
    return {"total": total, "with_tts": with_tts, "with_storytelling": with_story}


@router.get("/templates/{account_slug}/{event}", response=TemplateOut)
def get_template(request, account_slug: str, event: str):
    _require_admin(request)
    from accounts.models import Account
    from notify.models import Template

    acc = Account.objects.filter(slug=account_slug).first()
    if not acc:
        raise HttpError(404, f"Conta '{account_slug}' não encontrada.")
    t = Template.objects.filter(account=acc, event=event).first()
    if t is None:
        raise HttpError(404, "Template não encontrado.")
    return _template_out(t)


@router.put("/templates/{account_slug}/{event}", response=TemplateOut)
def upsert_template(request, account_slug: str, event: str, payload: TemplateUpsertIn):
    _require_admin(request)
    from accounts.models import Account
    from notify.interface import templates as _db_cache
    from notify.models import Template

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
            is_tts=payload.is_tts, storytelling=payload.storytelling, story_prompt=payload.story_prompt,
            channels=channels, media_url=payload.media_url, media_type=payload.media_type,
            mail_template=payload.mail_template or "default", notes=payload.notes,
        ),
    )
    _db_cache.invalidate(acc.id, event)
    return _template_out(t)


@router.put("/templates/{account_slug}/{event}/trigger", response=TriggerOut)
def upsert_trigger(request, account_slug: str, event: str, payload: TriggerUpsertIn):
    _require_admin(request)
    from accounts.models import Account
    from notify.interface import templates as _db_cache
    from notify.models import Template, Trigger

    acc = Account.objects.filter(slug=account_slug).first()
    if not acc:
        raise HttpError(404, f"Conta '{account_slug}' não encontrada.")
    t = Template.objects.filter(account=acc, event=event).first()
    if t is None:
        raise HttpError(404, "Template não encontrado.")

    tr, _ = Trigger.objects.update_or_create(
        template=t,
        defaults=dict(fires_on=payload.fires_on, source=payload.source,
                      delay_minutes=max(0, int(payload.delay_minutes)), active=payload.active),
    )
    _db_cache.invalidate(acc.id, event)
    return _trigger_out(tr)


@router.delete("/templates/{account_slug}/{event}")
def delete_template(request, account_slug: str, event: str):
    _require_admin(request)
    from accounts.models import Account
    from notify.interface import templates as _db_cache
    from notify.models import Template

    acc = Account.objects.filter(slug=account_slug).first()
    if not acc:
        raise HttpError(404, f"Conta '{account_slug}' não encontrada.")
    t = Template.objects.filter(account=acc, event=event).first()
    if t is None:
        raise HttpError(404, "Template não encontrado.")
    t.delete()
    _db_cache.invalidate(acc.id, event)
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
    _require_admin(request)
    from accounts.models import Account
    from notify.interface import templates as _db_cache

    acc = Account.objects.filter(slug=account_slug).first()
    if not acc:
        raise HttpError(404, f"Conta '{account_slug}' não encontrada.")
    data = _db_cache.get(acc.id, event)
    if data is None:
        raise HttpError(404, "Template não encontrado.")
    ctx = {"nome": "tudo bem", "nome_completo": "tudo bem", "name": "tudo bem"}
    if payload.ctx:
        ctx.update(payload.ctx)
    rendered = _db_cache.render(data.body_md, ctx)
    return PreviewOut(
        event=event, body_md=data.body_md, rendered=rendered,
        is_tts=data.is_tts, channels=list(data.channels),
    )
