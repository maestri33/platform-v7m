"""Servicos publicos do app profiles."""

from .contacts import get_profile_by_phone, get_profile_by_uuid, get_profile_contact_data, get_user_by_phone
from .creation import (
    create_user_profile_with_contact,
    validate_contact_number_for_new_profile,
    validate_contact_number_for_new_user,
)
from .self import (
    get_my_profile,
    get_my_profile_address,
    update_my_profile_address,
    update_my_profile_data,
)


def generate_user_otp(*, user):
    """Wrapper publico e lazily-loaded para OTP de usuario."""

    from .authentication import generate_user_otp as _generate_user_otp

    return _generate_user_otp(user=user)

__all__ = [
    "generate_user_otp",
    "create_user_profile_with_contact",
    "get_my_profile",
    "get_my_profile_address",
    "get_profile_by_phone",
    "get_profile_by_uuid",
    "get_profile_contact_data",
    "get_user_by_phone",
    "update_my_profile_address",
    "update_my_profile_data",
    "validate_contact_number_for_new_profile",
    "validate_contact_number_for_new_user",
]
