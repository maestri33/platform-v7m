"""Consultas de status do dominio visitors."""

from apps.profiles.services import get_profile_contact_data
from apps.visitors.models import VisitorStatus
from services.base import ServiceResponse


def get_visitor_status_for_user(*, user):
    """Retorna apenas o status do visitor vinculado ao usuario autenticado."""

    contact_data = get_profile_contact_data(user=user)
    profile = contact_data["profile"]
    if not profile:
        return ServiceResponse.fail("Perfil do usuario nao encontrado.")

    visitor = getattr(profile, "visitor", None)
    if not visitor:
        return ServiceResponse.fail("Visitante nao encontrado.")

    return ServiceResponse.ok(data={"status": VisitorStatus.details_for(visitor.status)})
