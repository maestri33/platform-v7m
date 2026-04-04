"""Progressão do funil de visitors baseada na completude dos dados."""

from apps.profiles.services import get_profile_contact_data
from apps.visitors.models import VisitorStatus
from apps.visitors.services.religion import get_missing_religious_fields
from services.base import ServiceResponse


def _get_visitor_for_user(*, user):
    contact_data = get_profile_contact_data(user=user)
    profile = contact_data["profile"]
    if not profile:
        return None, None
    return profile, getattr(profile, "visitor", None)


def _missing_profile_fields(profile):
    missing_fields = []
    if not str(profile.full_name or "").strip():
        missing_fields.append("full_name")
    if not profile.date_of_birth:
        missing_fields.append("date_of_birth")
    if not str(profile.gender or "").strip():
        missing_fields.append("gender")
    if not str(profile.marital_status or "").strip():
        missing_fields.append("marital_status")
    return missing_fields


def _missing_address_fields(profile):
    address = getattr(profile, "address", None)
    if not address:
        return ["zipcode", "street", "number", "neighborhood", "city", "state", "country"]

    missing_fields = []
    for field in ["zipcode", "street", "number", "neighborhood", "city", "state", "country"]:
        if not str(getattr(address, field, "") or "").strip():
            missing_fields.append(field)
    return missing_fields


def _status_payload(visitor):
    return VisitorStatus.details_for(visitor.status)


def advance_my_visitor_status(*, user):
    """Avança o visitante para a próxima etapa quando os dados necessários já existirem."""

    profile, visitor = _get_visitor_for_user(user=user)
    if not profile:
        return ServiceResponse.fail("Perfil do usuario nao encontrado.")
    if not visitor:
        return ServiceResponse.fail("Visitante nao encontrado.")

    current_status = visitor.status

    if current_status in {VisitorStatus.NEW_ONLINE, VisitorStatus.NEW_PRESENCIAL}:
        missing_fields = _missing_profile_fields(profile)
        if missing_fields:
            return ServiceResponse.fail(
                "Ainda faltam dados principais do perfil.",
                missing_fields=missing_fields,
                status=_status_payload(visitor),
            )
        visitor.status = (
            VisitorStatus.DATA_COMPLETED_ONLINE
            if current_status == VisitorStatus.NEW_ONLINE
            else VisitorStatus.DATA_COMPLETED_PRESENCIAL
        )
        visitor.save(update_fields=["status"])

    elif current_status in {VisitorStatus.DATA_COMPLETED_ONLINE, VisitorStatus.DATA_COMPLETED_PRESENCIAL}:
        missing_fields = _missing_address_fields(profile)
        if missing_fields:
            return ServiceResponse.fail(
                "Ainda faltam dados de endereco.",
                missing_fields=missing_fields,
                status=_status_payload(visitor),
            )
        visitor.status = (
            VisitorStatus.ADDRESS_COMPLETED_ONLINE
            if current_status == VisitorStatus.DATA_COMPLETED_ONLINE
            else VisitorStatus.ADDRESS_COMPLETED_PRESENCIAL
        )
        visitor.save(update_fields=["status"])

    elif current_status in {VisitorStatus.ADDRESS_COMPLETED_ONLINE, VisitorStatus.ADDRESS_COMPLETED_PRESENCIAL}:
        missing_fields = get_missing_religious_fields(visitor=visitor)
        if missing_fields:
            return ServiceResponse.fail(
                "Ainda faltam dados religiosos.",
                missing_fields=missing_fields,
                status=_status_payload(visitor),
            )
        visitor.status = (
            VisitorStatus.DATA_RELIGION_COMPLETED_ONLINE
            if current_status == VisitorStatus.ADDRESS_COMPLETED_ONLINE
            else VisitorStatus.DATA_RELIGION_COMPLETED_PRESENCIAL
        )
        visitor.save(update_fields=["status"])

    elif current_status in {
        VisitorStatus.DATA_RELIGION_COMPLETED_ONLINE,
        VisitorStatus.DATA_RELIGION_COMPLETED_PRESENCIAL,
    }:
        missing_fields = get_missing_religious_fields(visitor=visitor)
        if missing_fields:
            return ServiceResponse.fail(
                "Ainda faltam dados religiosos.",
                missing_fields=missing_fields,
                status=_status_payload(visitor),
            )
        visitor.status = (
            VisitorStatus.AWAITTING_PRESENTIAL_VISIT
            if current_status == VisitorStatus.DATA_RELIGION_COMPLETED_ONLINE
            else VisitorStatus.AWAITING_TO_COLLECT_YOUR_GIFT
        )
        visitor.save(update_fields=["status"])

    return ServiceResponse.ok(
        data={
            "status": _status_payload(visitor),
            "required_action": _status_payload(visitor).get("required_action", ""),
            "missing_fields": [],
        }
    )
