"""Login por UUID do perfil + OTP com emissão de JWT."""

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from ninja_jwt.exceptions import TokenError
from ninja_jwt.settings import api_settings
from ninja_jwt.tokens import RefreshToken

from apps.authentication.models import LoginOtpState
from apps.authentication.services.context import get_enabled_access_contexts
from apps.profiles.services.contacts import get_profile_by_uuid
from services.base import ServiceResponse


def _build_token_pair(*, user, profile, access_context):
    """Gera refresh token e access token com claims mínimas de contexto."""

    refresh = RefreshToken.for_user(user)
    refresh["profile_uuid"] = str(profile.uuid)
    refresh["is_visitor"] = access_context["is_visitor"]
    access_token = refresh.access_token
    access_token["profile_uuid"] = str(profile.uuid)
    access_token["is_visitor"] = access_context["is_visitor"]
    return str(refresh), str(access_token)


def refresh_token_pair(*, refresh):
    """Renova o access token a partir de um refresh token válido."""

    refresh_value = str(refresh or "").strip()
    if not refresh_value:
        return ServiceResponse.fail("Refresh token obrigatorio.")

    try:
        refresh_token = RefreshToken(refresh_value)
    except TokenError:
        return ServiceResponse.fail("Refresh token invalido ou expirado.")

    data = {
        "access": str(refresh_token.access_token),
        "refresh": refresh_value,
    }

    if api_settings.ROTATE_REFRESH_TOKENS:
        if api_settings.BLACKLIST_AFTER_ROTATION:
            try:
                refresh_token.blacklist()
            except AttributeError:
                pass

        refresh_token.set_jti()
        refresh_token.set_exp()
        refresh_token.set_iat()
        data["refresh"] = str(refresh_token)

    return ServiceResponse.ok(data=data)


@transaction.atomic
def login_with_profile_uuid_otp(*, profile_uuid, otp):
    """Autentica por UUID do perfil e OTP de uso único, retornando JWT."""

    profile = get_profile_by_uuid(profile_uuid=profile_uuid)
    if not profile:
        return ServiceResponse.fail("Perfil nao encontrado.")

    access_context = get_enabled_access_contexts(profile=profile)
    if not access_context["contexts"]:
        return ServiceResponse.fail("Perfil encontrado, mas sem contexto de acesso habilitado.")

    otp_code = str(otp or "").strip()
    if not otp_code:
        return ServiceResponse.fail("Codigo de verificacao obrigatorio.")

    user = profile.user
    otp_state = LoginOtpState.objects.filter(user=user).first()
    ttl_seconds = int(getattr(settings, "AUTH_LOGIN_OTP_TTL_SECONDS", 600))
    if not otp_state or otp_state.otp_created_at is None:
        return ServiceResponse.fail("Codigo de verificacao expirado.")
    if (timezone.now() - otp_state.otp_created_at).total_seconds() > ttl_seconds:
        user.set_unusable_password()
        user.save(update_fields=["password"])
        otp_state.otp_created_at = None
        otp_state.save(update_fields=["otp_created_at", "updated_at"])
        return ServiceResponse.fail("Codigo de verificacao expirado.")
    if not user.check_password(otp_code):
        return ServiceResponse.fail("Codigo de verificacao invalido.")

    refresh_token, access_token = _build_token_pair(
        user=user,
        profile=profile,
        access_context=access_context,
    )
    user.set_unusable_password()
    user.save(update_fields=["password"])
    otp_state.otp_created_at = None
    otp_state.save(update_fields=["otp_created_at", "updated_at"])

    return ServiceResponse.ok(
        data={
            "access": access_token,
            "refresh": refresh_token,
            "is_visitor": access_context["is_visitor"],
        }
    )
