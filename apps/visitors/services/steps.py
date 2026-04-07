"""Servicos de etapas do onboarding do visitante."""

from django.db import transaction

from apps.visitors.messages import address_saved_message, profile_saved_message
from apps.profiles.services import get_profile_contact_data, update_my_profile_address, update_my_profile_data
from apps.visitors.models import VisitorStatus
from services.base import ServiceResponse


def _serialize_profile_data(profile):
    """Serializa apenas os campos de dados principais expostos em visitors."""

    contact_data = get_profile_contact_data(profile=profile)
    return {
        "full_name": profile.full_name,
        "email": contact_data["email"],
        "date_of_birth": profile.date_of_birth,
        "gender": profile.gender,
        "marital_status": profile.marital_status,
    }


def _serialize_address_data(profile):
    """Serializa apenas os campos de endereco expostos em visitors."""

    address = getattr(profile, "address", None)
    if not address:
        return None
    return {
        "zipcode": address.zipcode,
        "street": address.street,
        "number": address.number,
        "complement": address.complement,
        "neighborhood": address.neighborhood,
        "city": address.city,
        "state": address.state,
        "country": address.country,
    }


def _get_profile_and_visitor(*, user):
    """Resolve profile e visitor do usuario autenticado."""

    contact_data = get_profile_contact_data(user=user)
    profile = contact_data["profile"]
    if not profile:
        return None, None
    return profile, getattr(profile, "visitor", None)


def _get_missing_profile_fields(profile):
    """Retorna os campos obrigatorios faltantes nos dados principais."""

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


def _get_missing_address_fields(profile):
    """Retorna os campos obrigatorios faltantes no endereco."""

    address = getattr(profile, "address", None)
    if not address:
        return ["zipcode", "street", "number", "neighborhood", "city", "state", "country"]

    missing_fields = []
    for field in ["zipcode", "street", "number", "neighborhood", "city", "state", "country"]:
        if not str(getattr(address, field, "") or "").strip():
            missing_fields.append(field)
    return missing_fields


def _status_payload(visitor):
    """Serializa o status atual do visitante."""

    return VisitorStatus.details_for(visitor.status)


def _format_missing_fields(fields):
    """Formata lista de campos para mensagem amigavel."""

    labels = {
        "full_name": "nome completo",
        "date_of_birth": "data de nascimento",
        "gender": "genero",
        "marital_status": "estado civil",
        "zipcode": "CEP",
        "street": "rua",
        "number": "numero",
        "neighborhood": "bairro",
        "city": "cidade",
        "state": "estado",
        "country": "pais",
    }
    return ", ".join(labels.get(field, field) for field in fields)


def _get_profile_data_message(*, visitor, missing_fields):
    """Monta a mensagem do GET de dados principais."""
#TODO: colocar todas essas mensagens no .env
    if missing_fields:
        return (
            "Dados principais carregados. Ja recebemos parte do seu cadastro e ainda faltam: "
            f"{_format_missing_fields(missing_fields)}."
        )

    if visitor.status in {VisitorStatus.NEW_ONLINE, VisitorStatus.NEW_PRESENCIAL}:
        return "Dados principais carregados. Esta etapa ja esta pronta para seguir ao endereco."

    return (
        "Dados principais carregados. Esta etapa ja foi concluida. "
        f"Proximo passo: {_status_payload(visitor).get('required_action', '')}"
    )


def _get_address_message(*, visitor, missing_fields):
    """Monta a mensagem do GET de endereco."""

    if missing_fields:
        return (
            "Endereco carregado. Ja recebemos parte desta etapa e ainda faltam: "
            f"{_format_missing_fields(missing_fields)}."
        )

    if visitor.status in {VisitorStatus.DATA_COMPLETED_ONLINE, VisitorStatus.DATA_COMPLETED_PRESENCIAL}:
        return "Endereco carregado. Esta etapa já esta pronta para seguir aos dados sobre a sua fé."

    return (
        "Endereco carregado. Esta etapa ja foi concluida. "
        f"Proximo passo: {_status_payload(visitor).get('required_action', '')}"
    )


def _validate_required_step_fields(*, payload, required_fields):
    """Valida campos obrigatorios de uma etapa antes de persistir."""

    missing_fields = []
    for field in required_fields:
        value = payload.get(field)
        if value is None:
            missing_fields.append(field)
            continue
        if isinstance(value, str) and not value.strip():
            missing_fields.append(field)
    return missing_fields


def _promote_profile_status_if_ready(*, visitor, profile):
    """Promove status da etapa de dados principais quando a etapa estiver completa."""

    transitions = {
        VisitorStatus.NEW_ONLINE: VisitorStatus.DATA_COMPLETED_ONLINE,
        VisitorStatus.NEW_PRESENCIAL: VisitorStatus.DATA_COMPLETED_PRESENCIAL,
    }
    next_status = transitions.get(visitor.status)
    if next_status and not _get_missing_profile_fields(profile):
        visitor.status = next_status
        visitor.save(update_fields=["status"])


def _promote_address_status_if_ready(*, visitor, profile):
    """Promove status da etapa de endereco quando a etapa estiver completa."""

    transitions = {
        VisitorStatus.DATA_COMPLETED_ONLINE: VisitorStatus.ADDRESS_COMPLETED_ONLINE,
        VisitorStatus.DATA_COMPLETED_PRESENCIAL: VisitorStatus.ADDRESS_COMPLETED_PRESENCIAL,
    }
    next_status = transitions.get(visitor.status)
    if next_status and not _get_missing_address_fields(profile):
        visitor.status = next_status
        visitor.save(update_fields=["status"])


def get_my_visitor_profile_data(*, user):
    """Retorna os dados principais do visitante com contexto da etapa."""

    profile, visitor = _get_profile_and_visitor(user=user)
    if not profile:
        return ServiceResponse.fail("Perfil do usuario nao encontrado.")
    if not visitor:
        return ServiceResponse.fail("Visitante nao encontrado.")

    missing_fields = _get_missing_profile_fields(profile)
    status = _status_payload(visitor)
    return ServiceResponse.ok(
        data={
            "profile": _serialize_profile_data(profile),
            "status": status,
            "required_action": status.get("required_action", ""),
            "missing_fields": missing_fields,
        },
        message=_get_profile_data_message(visitor=visitor, missing_fields=missing_fields),
    )


@transaction.atomic
def save_my_visitor_profile_data(*, user, payload):
    """Salva os dados principais no fluxo de visitors e promove a etapa quando couber."""

    profile, visitor = _get_profile_and_visitor(user=user)
    if not profile:
        return ServiceResponse.fail("Perfil do usuario nao encontrado.")
    if not visitor:
        return ServiceResponse.fail("Visitante nao encontrado.")

    payload = dict(payload or {})
    missing_fields = _validate_required_step_fields(
        payload=payload,
        required_fields=["full_name", "date_of_birth", "gender", "marital_status"],
    )
    if missing_fields:
        status = _status_payload(visitor)
        return ServiceResponse.fail(
            "Ainda faltam dados principais do perfil.",
            missing_fields=missing_fields,
            status=status,
        )

    update_response = update_my_profile_data(user=user, payload=payload)
    if not update_response.success:
        return update_response

    profile.refresh_from_db()
    visitor.refresh_from_db()
    _promote_profile_status_if_ready(visitor=visitor, profile=profile)
    visitor.refresh_from_db()

    status = _status_payload(visitor)
    return ServiceResponse.ok(
        data={
            "profile": _serialize_profile_data(profile),
            "status": status,
            "required_action": status.get("required_action", ""),
            "missing_fields": _get_missing_profile_fields(profile),
        },
        message=profile_saved_message(status.get("required_action", "")),
    )


def get_my_visitor_address(*, user):
    """Retorna o endereco do visitante com contexto da etapa."""

    profile, visitor = _get_profile_and_visitor(user=user)
    if not profile:
        return ServiceResponse.fail("Perfil do usuario nao encontrado.")
    if not visitor:
        return ServiceResponse.fail("Visitante nao encontrado.")

    missing_fields = _get_missing_address_fields(profile)
    status = _status_payload(visitor)
    return ServiceResponse.ok(
        data={
            "address": _serialize_address_data(profile),
            "status": status,
            "required_action": status.get("required_action", ""),
            "missing_fields": missing_fields,
        },
        message=_get_address_message(visitor=visitor, missing_fields=missing_fields),
    )


@transaction.atomic
def save_my_visitor_address(*, user, payload):
    """Salva o endereco no fluxo de visitors e promove a etapa quando couber."""

    profile, visitor = _get_profile_and_visitor(user=user)
    if not profile:
        return ServiceResponse.fail("Perfil do usuario nao encontrado.")
    if not visitor:
        return ServiceResponse.fail("Visitante nao encontrado.")

    payload = dict(payload or {})
    missing_fields = _validate_required_step_fields(
        payload=payload,
        required_fields=["zipcode", "street", "number", "neighborhood", "city", "state"],
    )
    if missing_fields:
        status = _status_payload(visitor)
        return ServiceResponse.fail(
            "Ainda faltam dados de endereco.",
            missing_fields=missing_fields,
            status=status,
        )

    update_response = update_my_profile_address(user=user, payload=payload)
    if not update_response.success:
        return update_response

    profile.refresh_from_db()
    visitor.refresh_from_db()
    _promote_address_status_if_ready(visitor=visitor, profile=profile)
    visitor.refresh_from_db()

    status = _status_payload(visitor)
    return ServiceResponse.ok(
        data={
            "address": _serialize_address_data(profile),
            "status": status,
            "required_action": status.get("required_action", ""),
            "missing_fields": _get_missing_address_fields(profile),
        },
        message=address_saved_message(status.get("required_action", "")),
    )
