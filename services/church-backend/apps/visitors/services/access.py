"""Contratos de acesso do dominio visitors."""

from apps.visitors.models import Visitor


def get_access_context(*, profile):
    """Retorna o contexto de acesso do profile dentro de visitors."""

    visitor = Visitor.objects.filter(profile=profile).first()
    if not visitor:
        return {
            "matched": False,
            "type": "visitor",
            "record_id": None,
            "status": "",
            "can_login": False,
        }

    return {
        "matched": True,
        "type": "visitor",
        "record_id": visitor.id,
        "status": visitor.status,
        "can_login": True,
    }
