"""
Signals para automação do fluxo de notificações.
"""

import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from notifications.models import Notification
from notifications.services.queue import enqueue_notification

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Notification)
def auto_enqueue_notification(sender, instance: Notification, created: bool, **kwargs):
    """
    Automaticamente envia a notificação para a fila ao ser criada.
    
    - Se for uma notificação nova (created=True): envia para fila
    - Se scheduled_for estiver preenchido: será processado no momento correto
    - Se scheduled_for estiver vazio: processa assim que possível
    """
    if not created:
        return
    
    # Evita reenvio se já estiver em processamento ou enviada
    if instance.status not in [Notification.Status.PENDING]:
        logger.debug(f"Notificação {instance.id} não está pendente, ignorando enqueue")
        return

    def _dispatch():
        try:
            mode = enqueue_notification(instance.id)
            logger.info(
                "Notificação %s preparada para entrega automática via %s",
                instance.id,
                mode,
            )
        except Exception as exc:
            logger.exception(
                "Falha ao preparar a notificação %s para entrega: %s",
                instance.id,
                exc,
            )

    transaction.on_commit(_dispatch)
