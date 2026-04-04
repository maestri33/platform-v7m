"""Fluxos de OTP de login."""

import secrets

from django.contrib.auth import get_user_model

from apps.authentication.notifications import create_login_otp_notification
from notifications.models import Notification
from notifications.send import send_notification
from services.base import ServiceResponse

User = get_user_model()


def _resolve_user(user):
    """Resolve o usuario por instancia ou id."""

    if isinstance(user, User):
        return user
    return User.objects.filter(pk=user).first()


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


def create_and_send_login_otp(*, user):
    """Gera OTP, cria notificacao e dispara o envio."""

    otp_response = generate_login_otp(user=user)
    if not otp_response.success:
        return otp_response

    otp = otp_response.data["otp"]
    notification_response = create_login_otp_notification(user=user, otp=otp)
    if not notification_response.success:
        return notification_response

    send_notification(notification_response.data["notification_id"])
    notification = Notification.objects.get(id=notification_response.data["notification_id"])

    return ServiceResponse.ok(
        data={
            "otp": otp,
            "user_id": otp_response.data["user_id"],
            "notification_id": notification.id,
            "notification_status": notification.status,
            "channel_sent": notification.channel_sent,
            "frontend_link": notification_response.data.get("frontend_link", ""),
        }
    )
