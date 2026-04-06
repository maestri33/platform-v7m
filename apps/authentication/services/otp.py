"""Fluxos de OTP de login."""

import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.authentication.models import LoginOtpState
from notifications.models import Notification
from notifications.send import send_notification
from services.base import ServiceResponse

User = get_user_model()
OTP_BLOCKED_MESSAGE = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."


def _resolve_user(user):
    """Resolve o usuario por instancia ou id."""

    if isinstance(user, User):
        return user
    return User.objects.filter(pk=user).first()


def _get_or_create_otp_state(*, user):
    return LoginOtpState.objects.get_or_create(user=user)


def _reset_send_window_if_needed(*, otp_state, now):
    window_seconds = int(getattr(settings, "AUTH_LOGIN_OTP_WINDOW_SECONDS", 900))
    started_at = otp_state.send_window_started_at
    if started_at is None or (now - started_at).total_seconds() >= window_seconds:
        otp_state.send_window_started_at = now
        otp_state.sends_in_window = 0


def _validate_send_limits(*, otp_state, now):
    cooldown_seconds = int(getattr(settings, "AUTH_LOGIN_OTP_COOLDOWN_SECONDS", 60))
    max_sends = int(getattr(settings, "AUTH_LOGIN_OTP_MAX_SENDS_PER_WINDOW", 5))

    if otp_state.last_sent_at and (now - otp_state.last_sent_at).total_seconds() < cooldown_seconds:
        return ServiceResponse.fail(OTP_BLOCKED_MESSAGE, status_code=429)

    _reset_send_window_if_needed(otp_state=otp_state, now=now)
    if otp_state.sends_in_window >= max_sends:
        return ServiceResponse.fail(OTP_BLOCKED_MESSAGE, status_code=429)

    return ServiceResponse.ok()


def generate_login_otp(*, user):
    """Gera OTP de 6 digitos, salva como senha do usuario e retorna o codigo."""

    instance = _resolve_user(user)
    if not instance:
        return ServiceResponse.fail("Usuario nao encontrado.")

    otp = f"{secrets.randbelow(1_000_000):06d}"
    instance.set_password(otp)
    instance.save(update_fields=["password"])

    return ServiceResponse.ok(
        data={
            "otp": otp,
            "user_id": instance.pk,
        }
    )


@transaction.atomic
def create_and_send_login_otp(*, user):
    """Gera OTP, cria notificacao e dispara o envio."""

    from apps.authentication.notifications import create_login_otp_notification

    instance = _resolve_user(user)
    if not instance:
        return ServiceResponse.fail("Usuario nao encontrado.")

    otp_state, _ = _get_or_create_otp_state(user=instance)
    now = timezone.now()
    rate_limit_response = _validate_send_limits(otp_state=otp_state, now=now)
    if not rate_limit_response.success:
        return rate_limit_response

    otp_response = generate_login_otp(user=instance)
    if not otp_response.success:
        return otp_response

    otp = otp_response.data["otp"]
    notification_response = create_login_otp_notification(user=instance, otp=otp)
    if not notification_response.success:
        return notification_response

    send_notification(notification_response.data["notification_id"])
    notification = Notification.objects.get(id=notification_response.data["notification_id"])

    otp_state.otp_created_at = now
    otp_state.last_sent_at = now
    otp_state.sends_in_window += 1
    otp_state.save(
        update_fields=[
            "otp_created_at",
            "last_sent_at",
            "send_window_started_at",
            "sends_in_window",
            "updated_at",
        ]
    )

    return ServiceResponse.ok(
        data={
            "otp": otp,
            "user_id": otp_response.data["user_id"],
            "notification_id": notification.id,
            "notification_status": notification.status,
            "channel_sent": notification.channel_sent,
            "frontend_link": notification_response.data.get("frontend_link", ""),
            "otp_expires_in_seconds": int(getattr(settings, "AUTH_LOGIN_OTP_TTL_SECONDS", 600)),
        }
    )
