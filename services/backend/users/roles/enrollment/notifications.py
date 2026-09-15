from __future__ import annotations

from django.conf import settings

from users.profiles import interface as profiles
from users.roles.enrollment.common import _S, _set_status, logger
from users.roles.enrollment.models import Enrollment


def _resume_link() -> str:
    from users.roles.lead.config import frontend_url

    base = frontend_url().rstrip("/")
    if not base:
        return ""
    return base + getattr(settings, "ENROLLMENT_RESUME_PATH", "/matricula")


def _notify_resolution(enr: Enrollment, event_key: str, **placeholders) -> None:
    from notify.interface.events import send_event

    p = profiles.get(enr.user)
    ctx = dict(placeholders)
    if event_key != "enrollment.selfie_approved" and (link := _resume_link()):
        ctx["link"] = link
    try:
        send_event(event_key, profile=p, ctx=ctx, subject="Sua matrícula — atualização")
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "enrollment.notify_resolution_failed", event=event_key, error=str(exc)
        )


def _notify_rg_rejected(enr: Enrollment, reason: str | None) -> None:
    _notify_resolution(enr, "enrollment.rg_rejected", detail=(reason or "").strip())


def _notify_rg_review(enr: Enrollment, reason: str | None) -> None:
    from notify.interface.events import send_event

    coord = enr.hub.coordinator
    if coord is None:
        return
    try:
        send_event(
            "enrollment.rg_in_review",
            profile=profiles.get(coord),
            ctx={"detail": (reason or "").strip()},
            channels_override=("whatsapp",),
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("enrollment.notify_rg_review_failed", error=str(exc))


def _notify_rg_approved(enr: Enrollment) -> None:
    _notify_resolution(enr, "enrollment.rg_approved")


def _notify_selfie_rejected(enr: Enrollment) -> None:
    _notify_resolution(enr, "enrollment.selfie_rejected")


def _notify_selfie_approved(enr: Enrollment) -> None:
    _notify_resolution(enr, "enrollment.selfie_approved")


def _notify_selfie_review(enr: Enrollment) -> None:
    from notify.interface.events import send_event

    coord = enr.hub.coordinator
    if coord is None:
        return
    try:
        send_event(
            "enrollment.selfie_in_review",
            profile=profiles.get(coord),
            channels_override=("whatsapp",),
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("enrollment.notify_selfie_review_failed", error=str(exc))


def _notify_coordinator_awaiting(enr: Enrollment) -> None:
    from notify.interface.events import send_event

    coord = enr.hub.coordinator
    if coord is None:
        return
    try:
        send_event(
            "enrollment.awaiting_release",
            profile=profiles.get(coord),
            channels_override=("whatsapp",),
            idempotency_key=f"enr_awaiting_{enr.external_id}",
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("enrollment.notify_coord_failed", error=str(exc))


def _advance_to_release(enr: Enrollment) -> None:
    if enr.status != _S.SELFIE:
        return
    _set_status(enr, _S.AWAITING_RELEASE)
    _notify_coordinator_awaiting(enr)
