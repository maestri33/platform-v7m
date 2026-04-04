"""Leitura e atualização dos dados religiosos do visitante."""

from django.db import transaction

from apps.profiles.services import get_profile_contact_data
from apps.visitors.models import ChristianityTypeChoices, EvangelicalChurchInfo, ReligionChoices, VisitorStatus
from services.base import ServiceResponse


def _get_visitor_for_user(*, user):
    contact_data = get_profile_contact_data(user=user)
    profile = contact_data["profile"]
    if not profile:
        return None
    return getattr(profile, "visitor", None)


def _serialize_religious_data(visitor):
    info = getattr(visitor, "evangelical_church_info", None)
    return {
        "religion": visitor.religion,
        "christianity_type": visitor.christianity_type,
        "evangelical_church_name": getattr(info, "church_name", ""),
        "evangelical_is_in_communion": getattr(info, "is_in_communion", None),
    }


def get_missing_religious_fields(*, visitor):
    missing_fields = []

    if not str(visitor.religion or "").strip():
        missing_fields.append("religion")
        return missing_fields

    if visitor.religion == ReligionChoices.CHRISTIANITY and not str(visitor.christianity_type or "").strip():
        missing_fields.append("christianity_type")
        return missing_fields

    if visitor.christianity_type == ChristianityTypeChoices.EVANGELICAL_PROTESTANT:
        info = getattr(visitor, "evangelical_church_info", None)
        if not info or not str(info.church_name or "").strip():
            missing_fields.append("evangelical_church_name")
        if not info or info.is_in_communion is None:
            missing_fields.append("evangelical_is_in_communion")

    return missing_fields


def get_my_visitor_religious_data(*, user):
    """Retorna apenas os dados religiosos do visitante autenticado."""

    visitor = _get_visitor_for_user(user=user)
    if not visitor:
        return ServiceResponse.fail("Visitante nao encontrado.")

    return ServiceResponse.ok(
        data={
            "religious_data": _serialize_religious_data(visitor),
        }
    )


@transaction.atomic
def update_my_visitor_religious_data(*, user, payload):
    """Atualiza apenas os dados religiosos do visitante autenticado."""

    visitor = _get_visitor_for_user(user=user)
    if not visitor:
        return ServiceResponse.fail("Visitante nao encontrado.")

    payload = dict(payload or {})
    religion = payload.get("religion")
    christianity_type = payload.get("christianity_type")
    church_name = payload.get("evangelical_church_name")
    is_in_communion = payload.get("evangelical_is_in_communion")

    if religion is not None:
        religion = str(religion or "").strip()
        valid_values = {choice.value for choice in ReligionChoices}
        if religion and religion not in valid_values:
            return ServiceResponse.fail("Religiao invalida.")
        visitor.religion = religion

    if christianity_type is not None:
        christianity_type = str(christianity_type or "").strip()
        valid_values = {choice.value for choice in ChristianityTypeChoices}
        if christianity_type and christianity_type not in valid_values:
            return ServiceResponse.fail("Tipo de cristianismo invalido.")
        visitor.christianity_type = christianity_type

    if visitor.religion != ReligionChoices.CHRISTIANITY:
        visitor.christianity_type = ""

    visitor.save(update_fields=["religion", "christianity_type"])

    info = getattr(visitor, "evangelical_church_info", None)
    needs_info = visitor.christianity_type == ChristianityTypeChoices.EVANGELICAL_PROTESTANT
    if needs_info:
        if info is None:
            info = EvangelicalChurchInfo.objects.create(visitor=visitor)
        changed_fields = []
        if church_name is not None:
            normalized_name = str(church_name or "").strip()
            if info.church_name != normalized_name:
                info.church_name = normalized_name
                changed_fields.append("church_name")
        if is_in_communion is not None and info.is_in_communion != is_in_communion:
            info.is_in_communion = is_in_communion
            changed_fields.append("is_in_communion")
        if changed_fields:
            info.save(update_fields=changed_fields)
    elif info is not None and (info.church_name or info.is_in_communion is not None):
        info.church_name = ""
        info.is_in_communion = None
        info.save(update_fields=["church_name", "is_in_communion"])

    return ServiceResponse.ok(
        data={
            "religious_data": _serialize_religious_data(visitor),
            "status": VisitorStatus.details_for(visitor.status),
            "missing_fields": get_missing_religious_fields(visitor=visitor),
        }
    )
