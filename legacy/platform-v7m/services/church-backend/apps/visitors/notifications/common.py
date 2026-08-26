"""Helpers compartilhados para notificações do domínio de visitantes."""

from apps.visitors.models import Visitor
from notifications.models import Notification
from services.base import ServiceResponse


def _resolve_visitor(visitor):
    """Resolve o visitante por instância ou id."""

    if isinstance(visitor, Visitor):
        return (
            Visitor.objects.select_related("profile__user")
            .filter(pk=visitor.pk)
            .first()
        )
    if visitor is None:
        return None
    return (
        Visitor.objects.select_related("profile__user")
        .filter(pk=visitor)
        .first()
    )


def _resolve_first_name(visitor):
    """Resolve um primeiro nome amigável para a copy da notificação."""

    user = getattr(getattr(visitor, "profile", None), "user", None)
    first_name = str(getattr(user, "first_name", "") or "").strip()
    if first_name:
        return first_name

    full_name = str(getattr(getattr(visitor, "profile", None), "full_name", "") or "").strip()
    if full_name:
        return full_name.split()[0]

    return "Visitante"


def create_visitor_notification(*, visitor, title, content, event_key):
    """Cria uma notificação TTS vinculada ao visitante informado."""

    instance = _resolve_visitor(visitor)
    if not instance:
        return ServiceResponse.fail("Visitante nao encontrado.")

    notification = Notification.objects.create(
        recipient=instance.profile,
        title=title,
        content=content,
        event_key=event_key,
        use_tts=True,
    )
    return ServiceResponse.ok(
        data={
            "notification_id": notification.id,
            "profile_id": instance.profile_id,
            "visitor_id": instance.id,
            "event_key": notification.event_key,
        }
    )
