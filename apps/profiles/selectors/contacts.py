"""Consultas públicas de contato."""

from apps.profiles.models import Phone


def get_profile_primary_contact(profile):
    """Retorna contato principal disponível para o perfil."""

    phone = Phone.objects.filter(profile=profile).first()
    email = profile.user.email if profile.user.email else ""
    if not phone and not email:
        return None

    return {
        "phone": phone.number if phone else "",
        "email": email,
    }
