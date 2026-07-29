"""Pre-login de autenticacao por telefone."""

from apps.authentication.services.context import get_enabled_access_contexts
from apps.authentication.services.otp import create_and_send_login_otp
from apps.profiles.services.contacts import get_profile_by_phone
from services.base import ServiceResponse


def _first_name_for(profile):
    """Resolve o primeiro nome mais amigavel disponivel."""

    user = getattr(profile, "user", None)
    if user and str(user.first_name or "").strip():
        return str(user.first_name).strip()

    full_name = str(getattr(profile, "full_name", "") or "").strip()
    if full_name:
        return full_name.split()[0]
    return ""


def auth_check(*, phone):
    """Valida telefone, contexto de acesso e dispara OTP de login."""

    profile = get_profile_by_phone(phone=phone)
    if not profile:
        return ServiceResponse.fail("Nao existe nenhum usuario com esse numero de telefone.")

    access_context = get_enabled_access_contexts(profile=profile)
    contexts = access_context["contexts"]

    if not contexts:
        return ServiceResponse.fail("Perfil encontrado, mas sem contexto de acesso habilitado.")

    otp_delivery = create_and_send_login_otp(user=profile.user)
    if not otp_delivery.success:
        return otp_delivery

    return ServiceResponse.ok(
        data={
            "first_name": _first_name_for(profile),
            "profile_uuid": str(profile.uuid),
            "is_visitor": access_context["is_visitor"],
        }
    )
