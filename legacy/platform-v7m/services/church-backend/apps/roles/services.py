"""Concessão e revogação de papéis, respeitando o catálogo de transições."""

from django.db import transaction
from django.utils import timezone

from .catalog import transition_mode
from .models import ProfileRole, Role


class RoleTransitionError(Exception):
    """Transição de papel não permitida por ``settings.ROLE_RULES``."""


def active_role_row(profile):
    """Linha do papel ativo do perfil, ou ``None``."""

    return ProfileRole.objects.filter(profile=profile, is_active=True).first()


def active_role(profile):
    """Papel ativo do perfil como string ("" quando não há)."""

    row = active_role_row(profile)
    return row.role if row else ""


@transaction.atomic
def grant_role(profile, role, *, source="", granted_by=None):
    """Concede ``role`` ao perfil. Idempotente e obediente ao catálogo.

    O ``mode`` do catálogo decide se a transição é permitida; a desativação do
    papel anterior acontece de qualquer forma, porque a constraint só admite um
    papel ativo por perfil (o "add" do catálogo só aparece quando não há papel
    anterior algum).
    """

    role = str(role or "")
    if role not in Role.values:
        raise RoleTransitionError(f"Papel desconhecido: {role!r}.")

    current = active_role_row(profile)
    if current and current.role == role:
        return current

    if transition_mode(current.role if current else None, role) is None:
        origem = current.role if current else "sem papel"
        raise RoleTransitionError(f"Transição não permitida: {origem} → {role}.")

    if current:
        current.is_active = False
        current.revoked_at = timezone.now()
        current.save()

    return ProfileRole.objects.create(
        profile=profile,
        role=role,
        source=source or "",
        granted_by=granted_by,
    )


@transaction.atomic
def revoke_role(profile, *, reason=""):
    """Revoga o papel ativo do perfil (mantendo o histórico). Devolve a linha."""

    row = active_role_row(profile)
    if not row:
        return None
    row.is_active = False
    row.revoked_at = timezone.now()
    if reason:
        row.source = (row.source or "")[:24] + ":revogado"
    row.save()
    return row
