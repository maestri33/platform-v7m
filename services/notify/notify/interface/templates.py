"""Cache de Template POR CONTA — porte do monólito adaptado para multi-tenant.

Cache por (account_id, event) com TTL 30s. Invalidação por signal.
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass

import structlog
from django.db.models.signals import post_delete, post_save

logger = structlog.get_logger()

_PLACEHOLDER_RE = re.compile(r"\{([a-z][a-z0-9_-]*)\}")
_CACHE_TTL_S = 30


@dataclass(frozen=True)
class TemplateData:
    """Snapshot imutável de um Template (thread-safe)."""

    event: str
    account_id: int
    title: str | None
    subject: str | None
    body_md: str
    storytelling: bool
    story_prompt: str | None
    channels: tuple[str, ...]
    media_url: str | None
    media_type: str | None
    mail_template: str

    @classmethod
    def from_model(cls, t) -> "TemplateData":
        return cls(
            event=t.event,
            account_id=t.account_id,
            title=t.title,
            subject=t.subject,
            body_md=t.body_md or "",
            storytelling=t.storytelling,
            story_prompt=t.story_prompt,
            channels=tuple(t.channel_list),
            media_url=t.media_url or None,
            media_type=t.media_type or None,
            mail_template=t.mail_template or "default",
        )


# cache: (account_id, event) -> (TemplateData | None, monotonic_ts)
_CACHE: dict[tuple[int, str], tuple[TemplateData | None, float]] = {}


def _load(account_id: int, event: str) -> TemplateData | None:
    from notify.models import Template

    key = (account_id, event)
    cached = _CACHE.get(key)
    if cached is not None and (time.monotonic() - cached[1]) < _CACHE_TTL_S:
        return cached[0]
    try:
        row = Template.objects.filter(account_id=account_id, event=event).first()
    except Exception as exc:
        logger.warning("notify.template_db_error", account_id=account_id, event_key=event, error=str(exc)[:160])
        return cached[0] if cached is not None else None
    data = TemplateData.from_model(row) if row is not None else None
    _CACHE[key] = (data, time.monotonic())
    return data


def get(account_id: int, event: str) -> TemplateData | None:
    return _load(account_id, event)


def invalidate(account_id: int | None = None, event: str | None = None) -> None:
    """Invalida cache. account_id+event → uma entrada; account_id só → toda conta; nada → tudo."""
    if account_id is not None and event is not None:
        _CACHE.pop((account_id, event), None)
    elif account_id is not None:
        for key in list(_CACHE):
            if key[0] == account_id:
                _CACHE.pop(key, None)
    else:
        _CACHE.clear()


def render(body: str, ctx: dict) -> str:
    """Substitui placeholders {chave} por ctx[chave]; ausentes ficam literais."""
    if not body:
        return ""

    def _sub(m: re.Match) -> str:
        key = m.group(1)
        if key in ctx:
            return str(ctx[key])
        alias = key.replace("-", "_")
        if alias != key and alias in ctx:
            return str(ctx[alias])
        if key == "nome" and "name" in ctx:
            return str(ctx["name"])
        if key == "name" and "nome" in ctx:
            return str(ctx["nome"])
        return m.group(0)

    return _PLACEHOLDER_RE.sub(_sub, body)


def render_event(account_id: int, event: str, ctx: dict) -> tuple[str | None, TemplateData | None]:
    data = _load(account_id, event)
    if data is None:
        return None, None
    return render(data.body_md, ctx), data


# ── signals ─────────────────────────────────────────────────────────────────

def _on_template_save(sender, instance, **_kwargs) -> None:
    invalidate(instance.account_id, instance.event)


def _on_template_delete(sender, instance, **_kwargs) -> None:
    invalidate(instance.account_id, instance.event)


def connect_signals() -> None:
    from notify.models import Template

    post_save.connect(_on_template_save, sender=Template, dispatch_uid="notify.template.cache_invalidate")
    post_delete.connect(_on_template_delete, sender=Template, dispatch_uid="notify.template.cache_invalidate_del")
