"""Fluxos de criação do domínio de visitantes."""

from django.db import transaction
from django.utils import timezone

from apps.profiles.services import create_user_profile_with_contact, get_profile_by_phone
from apps.visitors.models import Visitor, VisitorStatus
from services.base import ServiceResponse


@transaction.atomic
def create_visitor(*, contact_number):
    """Cria um novo visitante com a base comum de identidade em profiles."""

    existing_profile = get_profile_by_phone(phone=contact_number)
    if existing_profile:
        visitor = getattr(existing_profile, "visitor", None)
        if visitor is None:
            visitor = Visitor.objects.create(profile=existing_profile, status=VisitorStatus.NEW_ONLINE)
        return ServiceResponse.ok(
            data={
                "profile_id": existing_profile.id,
                "profile_uuid": str(existing_profile.uuid),
                "visitor_status": visitor.status,
                "reused_existing_profile": True,
            }
        )

    base_creation = create_user_profile_with_contact(
        contact_number=contact_number,
    )
    if not base_creation.success:
        return base_creation

    visitor = Visitor.objects.create(profile_id=base_creation.data["profile_id"], status=VisitorStatus.NEW_ONLINE)

    return ServiceResponse.ok(
        data={
            "profile_id": base_creation.data["profile_id"],
            "profile_uuid": base_creation.data["profile_uuid"],
            "visitor_status": visitor.status,
            "reused_existing_profile": False,
        }
    )


def _promote_online_status_to_presential(status):
    """Converte status online equivalente para o fluxo presencial."""

    transitions = {
        VisitorStatus.NEW_ONLINE: VisitorStatus.NEW_PRESENCIAL,
        VisitorStatus.DATA_COMPLETED_ONLINE: VisitorStatus.DATA_COMPLETED_PRESENCIAL,
        VisitorStatus.ADDRESS_COMPLETED_ONLINE: VisitorStatus.ADDRESS_COMPLETED_PRESENCIAL,
        VisitorStatus.AWAITTING_PRESENTIAL_VISIT: VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT,
        5: VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT,
    }
    return transitions.get(status, status)


@transaction.atomic
def create_presential_visitor(*, contact_number):
    """Cria um visitante presencial ou promove um cadastro online já existente."""

    visit_date = timezone.localdate()
    existing_profile = get_profile_by_phone(phone=contact_number)
    if existing_profile:
        visitor = getattr(existing_profile, "visitor", None)
        if visitor is None:
            visitor = Visitor.objects.create(
                profile=existing_profile,
                status=VisitorStatus.NEW_PRESENCIAL,
                date_of_visit=visit_date,
            )
        else:
            update_fields = []
            promoted_status = _promote_online_status_to_presential(visitor.status)
            if promoted_status != visitor.status:
                visitor.status = promoted_status
                update_fields.append("status")
            if visitor.date_of_visit is None:
                visitor.date_of_visit = visit_date
                update_fields.append("date_of_visit")
            if update_fields:
                visitor.save(update_fields=update_fields)

        return ServiceResponse.ok(
            data={
                "profile_id": existing_profile.id,
                "profile_uuid": str(existing_profile.uuid),
                "visitor_status": visitor.status,
                "reused_existing_profile": True,
            }
        )

    base_creation = create_user_profile_with_contact(contact_number=contact_number)
    if not base_creation.success:
        return base_creation

    visitor = Visitor.objects.create(
        profile_id=base_creation.data["profile_id"],
        status=VisitorStatus.NEW_PRESENCIAL,
        date_of_visit=visit_date,
    )
    return ServiceResponse.ok(
        data={
            "profile_id": base_creation.data["profile_id"],
            "profile_uuid": base_creation.data["profile_uuid"],
            "visitor_status": visitor.status,
            "reused_existing_profile": False,
        }
    )
