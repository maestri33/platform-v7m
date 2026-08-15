"""Resolucao de destinatarios para notificacoes."""

from apps.profiles.services import get_profile_contact_data

def resolve_notification_recipient(profile):
    """Extrai telefone e email do perfil de forma tolerante."""

    return get_profile_contact_data(profile=profile)
