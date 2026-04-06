"""Fila simples para processar notificações pendentes e agendadas."""

from django.utils import timezone

from notifications.models import Notification
from notifications.send import send_notification


def process_due_notifications(*, limit=None):
    """Processa notificações pendentes cujo agendamento já venceu."""

    queryset = Notification.objects.filter(
        status=Notification.Status.PENDING,
        scheduled_for__isnull=False,
        scheduled_for__lte=timezone.now(),
    ).order_by("scheduled_for", "id")

    if limit is not None:
        queryset = queryset[: int(limit)]

    processed = 0
    for notification_id in queryset.values_list("id", flat=True):
        send_notification(notification_id)
        processed += 1

    return processed
