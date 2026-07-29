"""Criacao de notificacao de OTP para autenticacao."""
from django.contrib.auth import get_user_model

from apps.profiles.services.contacts import get_profile_contact_data
from notifications.models import Notification
from services.base import ServiceResponse

User = get_user_model()


def _resolve_user(user):
    """Resolve o usuario por instancia ou id."""

    if isinstance(user, User):
        return user
    return User.objects.filter(pk=user).first()


def create_login_otp_notification(*, user, otp):
    """Cria a notificacao de codigo de verificacao para login."""

    instance = _resolve_user(user)
    if not instance:
        return ServiceResponse.fail("Usuario nao encontrado.")

    contact_data = get_profile_contact_data(user=instance)
    profile = contact_data["profile"]
    if not profile:
        return ServiceResponse.fail("Perfil do usuário não encontrado.")

    otp_code = str(otp or "").strip()
    if not otp_code:
        return ServiceResponse.fail("OTP obrigatorio.")

    content = (
        "Olá! Para acessar sua conta, use este código de verificação: "
        f"*{otp_code}*."
        "\n\nSe você não solicitou este código, por favor ignore esta mensagem."
    )

    notification = Notification.objects.create(
        recipient=profile,
        title="# Código de verificação",
        content=content,
        event_key="auth-login-otp",
    )

    return ServiceResponse.ok(
        data={
            "notification_id": notification.id,
            "profile_id": profile.id,
            "user_id": instance.id,
            "event_key": notification.event_key,
        }
    )
