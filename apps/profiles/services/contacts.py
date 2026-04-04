"""Servicos de contato publico do app profiles."""

from uuid import UUID

from django.contrib.auth import get_user_model

from apps.profiles.models import Profile
from apps.profiles.utils import get_phone

User = get_user_model()


def _resolve_profile(*, profile=None, user=None, profile_uuid=None):
    """Resolve o perfil por profile, user ou uuid."""

    if isinstance(profile, Profile):
        return profile
    if profile is not None:
        return Profile.objects.select_related("user").filter(pk=profile).first()

    if isinstance(user, User):
        return Profile.objects.select_related("user").filter(user=user).first()
    if user is not None:
        return Profile.objects.select_related("user").filter(user_id=user).first()

    if profile_uuid is None:
        return None

    try:
        normalized_uuid = UUID(str(profile_uuid))
    except (TypeError, ValueError):
        return None

    return Profile.objects.select_related("user").filter(uuid=normalized_uuid).first()


def get_profile_contact_data(*, profile=None, user=None, profile_uuid=None):
    """Retorna telefone e email a partir de profile, user ou uuid do profile."""

    instance = _resolve_profile(profile=profile, user=user, profile_uuid=profile_uuid)
    resolved_user = getattr(instance, "user", None)
    phone = getattr(getattr(instance, "phone", None), "number", "") if instance else ""
    email = getattr(resolved_user, "email", "") if resolved_user else ""

    return {
        "phone": phone or "",
        "email": email or "",
        "user": resolved_user,
        "profile": instance,
        "profile_uuid": str(getattr(instance, "uuid", "") or ""),
    }


def get_profile_by_uuid(*, profile_uuid):
    """Resolve o profile a partir do uuid."""

    return _resolve_profile(profile_uuid=profile_uuid)


def get_profile_by_phone(*, phone):
    """Resolve o profile a partir do telefone cadastrado."""

    phone_record = get_phone(phone=phone)
    if not phone_record:
        return None
    return phone_record.profile


def get_user_by_phone(*, phone):
    """Resolve o usuario a partir do telefone cadastrado."""

    profile = get_profile_by_phone(phone=phone)
    return getattr(profile, "user", None)
