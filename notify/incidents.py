from django.db import transaction
from django.db.models import F

from notify.models import Incident


@transaction.atomic
def record_incident(*, notification, channel, category, summary, detail="") -> Incident:
    incident, created = Incident.objects.select_for_update().get_or_create(
        account=notification.account,
        channel=channel,
        category=category,
        defaults={"summary": summary, "detail": detail},
    )
    if not created:
        Incident.objects.filter(pk=incident.pk).update(
            occurrences=F("occurrences") + 1,
            status=Incident.STATUS_OPEN,
            summary=summary,
            detail=detail,
        )
        incident.refresh_from_db()
    incident.notifications.add(notification)
    return incident
