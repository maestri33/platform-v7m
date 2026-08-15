"""Signals do domínio de visitantes."""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.visitors.models import Visitor, VisitorStatus
from apps.visitors.notifications import create_visitor_4_notification, create_visitor_21_notification


@receiver(pre_save, sender=Visitor)
def capture_previous_visitor_status(sender, instance, **kwargs):
    """Captura o status anterior para reagir apenas a transições reais."""

    if not instance.pk:
        instance._previous_status = None
        return

    instance._previous_status = (
        Visitor.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
    )


@receiver(post_save, sender=Visitor)
def handle_visitor_status_notifications(sender, instance, created, **kwargs):
    """Dispara automações de notificação quando o status do visitante muda."""

    previous_status = getattr(instance, "_previous_status", None)
    current_status = int(instance.status)

    if not created and previous_status == current_status:
        return

    if current_status == int(VisitorStatus.AWAITTING_PRESENTIAL_VISIT):
        create_visitor_4_notification(visitor=instance)
        return

    if current_status == int(VisitorStatus.AWAITING_RECEPTION_CONTACT):
        create_visitor_21_notification(visitor=instance)
