"""Despacho por evento; templates e triggers pertencem ao notify-server."""

from __future__ import annotations

import uuid

import structlog
from django.db import transaction

logger = structlog.get_logger()


def _name(value: str | None, *, full: bool = False) -> str | None:
    clean = " ".join((value or "").split())
    return clean if full else (clean.split()[0] if clean else None)


def _resolve_profile(user, profile):
    if profile is None and user:
        from users.profiles import interface as profiles

        profile = profiles.find_by_external_id(str(getattr(user, "external_id", user)))
    if profile is None:
        return None, None, None, None, None
    raw_name = getattr(profile, "name", None)
    return (
        _name(raw_name),
        _name(raw_name, full=True),
        getattr(profile, "phone", None) or None,
        getattr(profile, "email", None) or None,
        getattr(profile, "gender", None) or None,
    )


def send_event(
    event: str,
    *,
    user=None,
    profile=None,
    phone: str | None = None,
    email: str | None = None,
    ctx: dict | None = None,
    title: str | None = None,
    subject: str | None = None,
    media_url: str | None = None,
    media_type: str | None = None,
    gender: str | None = None,
    mail_template: str | None = None,
    idempotency_key: str | None = None,
    run_sync: bool = False,
    body_md_override: str | None = None,
    is_tts_override: bool | None = None,
    channels_override: tuple[str, ...] | list[str] | None = None,
) -> str | None:
    nome, nome_completo, p_phone, p_email, p_gender = _resolve_profile(user, profile)
    phone = phone or p_phone
    email = email or p_email
    if not phone and not email:
        logger.warning("notify.event_no_recipient", event_key=event)
        return None

    client_uuid = str(uuid.uuid4())
    payload = {
        "event": event,
        "phone": phone,
        "email": email,
        "nome": nome,
        "nome_completo": nome_completo,
        "gender": gender or p_gender,
        "ctx": ctx,
        "title": title,
        "subject": subject,
        "media_url": media_url,
        "media_type": media_type,
        "mail_template": mail_template,
        "idempotency_key": idempotency_key or client_uuid,
        "body_md_override": body_md_override,
        "is_tts_override": is_tts_override,
        "channels_override": list(channels_override) if channels_override is not None else None,
        "run_sync": run_sync,
    }
    if run_sync:
        from notify.sdk import client

        result = client.post_send_event(payload, run_sync=True)
        return str(result["external_id"]) if result else None

    from django_q.tasks import async_task

    transaction.on_commit(lambda: async_task("notify.sdk.push.push_send_event", payload))
    logger.info("notify.remote_queued", external_id=client_uuid, event_key=event)
    return client_uuid
