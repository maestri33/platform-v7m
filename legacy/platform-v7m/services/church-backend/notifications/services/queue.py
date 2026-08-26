"""Utilitários de fila e processamento para notificações."""

import logging

from asgiref.sync import async_to_sync
from django.conf import settings
from django.utils import timezone

from notifications.models import Notification
from notifications.send import send_notification

logger = logging.getLogger(__name__)


def enqueue_notification(notification_id):
    """Agenda a entrega da notificação conforme a estratégia configurada."""

    taskiq_enabled = bool(getattr(settings, "TASKIQ_ENABLED", True))
    taskiq_eager = bool(getattr(settings, "TASKIQ_EAGER", False))

    if taskiq_enabled:
        from notifications.tasks import process_notification_async

        try:
            async_to_sync(process_notification_async.kiq)(notification_id)
            return "taskiq"
        except Exception as exc:
            if not taskiq_eager:
                logger.exception(
                    "Falha ao enfileirar notificação %s no Taskiq.",
                    notification_id,
                )
                raise

            logger.warning(
                "Falha ao enfileirar notificação %s no Taskiq; aplicando fallback síncrono: %s",
                notification_id,
                exc,
            )
            send_notification(notification_id)
            return "eager_fallback"

    if taskiq_eager:
        send_notification(notification_id)
        return "eager"

    logger.info(
        "Entrega automática desabilitada para a notificação %s.",
        notification_id,
    )
    return "disabled"


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
