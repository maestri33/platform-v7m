"""Consultas públicas de contato."""

from apps.profiles.services import get_profile_contact_data


def get_profile_primary_contact(profile):
    """Retorna contato principal disponível para o perfil."""

    contact_data = get_profile_contact_data(profile=profile)
    if not contact_data["phone"] and not contact_data["email"]:
        return None

    return {
        "phone": contact_data["phone"],
        "email": contact_data["email"],
    }
