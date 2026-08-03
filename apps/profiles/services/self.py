"""Leitura e edicao do proprio perfil autenticado."""

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.profiles.models import Address, Phone, StateChoices
from apps.profiles.validators import validate_profile_completion_data
from services.base import ServiceResponse
from services.communication.whatsapp_validation import validate_number

from .contacts import get_profile_by_phone, get_profile_contact_data
from .creation import _digits


def _serialize_address(address):
    """Serializa endereco para payload publico."""

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


def _serialize_profile(profile):
    """Serializa os dados principais do perfil autenticado."""

    contact_data = get_profile_contact_data(profile=profile)
    return {
        "profile_uuid": str(profile.uuid),
        "full_name": profile.full_name,
        "email": contact_data["email"],
        "phone": contact_data["phone"],
        "date_of_birth": profile.date_of_birth,
        "mother_name": profile.mother_name,
        "gender": profile.gender,
        "marital_status": profile.marital_status,
        "education_level": profile.education_level,
    }


def _get_profile_for_user(*, user):
    """Resolve o perfil do usuario autenticado."""

    contact_data = get_profile_contact_data(user=user)
    return contact_data["profile"]


def _validate_phone_update(*, profile, phone):
    """Valida troca de telefone mantendo unicidade e WhatsApp valido."""

    normalized_phone = _digits(phone)
    if not normalized_phone:
        return ServiceResponse.fail("Numero de contato obrigatorio.")

    current_phone = getattr(getattr(profile, "phone", None), "number", "")
    if _digits(current_phone) == normalized_phone:
        return ServiceResponse.ok(data={"contact_number": current_phone})

    existing_profile = get_profile_by_phone(phone=normalized_phone)
    if existing_profile and existing_profile.id != profile.id:
        return ServiceResponse.fail(
            "Numero de contato ja cadastrado no sistema.",
            status_code=409,
        )

    validation = validate_number(normalized_phone)
    if not validation.get("success"):
        return ServiceResponse.fail("Numero de contato invalido no WhatsApp.")

    provider_data = validation.get("data", {})
    return ServiceResponse.ok(
        data={"contact_number": provider_data.get("number") or normalized_phone}
    )


def _update_address(*, profile, address_data):
    """Cria ou atualiza endereco do perfil."""

    if address_data is None:
        return ServiceResponse.ok(data={"address": _serialize_address(profile.address)})

    provided = {key: value for key, value in address_data.items() if value is not None}
    if not provided:
        return ServiceResponse.ok(data={"address": _serialize_address(profile.address)})

    if "state" in provided and provided["state"] not in {choice.value for choice in StateChoices}:
        return ServiceResponse.fail("Estado invalido.")

    address = profile.address
    required_fields = {"street", "number", "neighborhood", "city", "state"}

    if address is None:
        missing = [field for field in required_fields if not str(provided.get(field, "")).strip()]
        if missing:
            return ServiceResponse.fail("Endereco incompleto para criacao.")
        address = Address.objects.create(
            zipcode=str(provided.get("zipcode", "") or ""),
            street=str(provided["street"]).strip(),
            number=str(provided["number"]).strip(),
            complement=str(provided.get("complement", "") or ""),
            neighborhood=str(provided["neighborhood"]).strip(),
            city=str(provided["city"]).strip(),
            state=str(provided["state"]).strip(),
            country=str(provided.get("country", "Brasil") or "Brasil").strip(),
        )
        profile.address = address
        profile.save(update_fields=["address"])
        return ServiceResponse.ok(data={"address": _serialize_address(address)})

    changed_fields = []
    for field in ["zipcode", "street", "number", "complement", "neighborhood", "city", "state", "country"]:
        if field not in provided:
            continue
        value = str(provided[field] or "").strip()
        if getattr(address, field) != value:
            setattr(address, field, value)
            changed_fields.append(field)
    if changed_fields:
        address.save(update_fields=changed_fields)
    return ServiceResponse.ok(data={"address": _serialize_address(address)})


def get_my_profile(*, user):
    """Retorna os dados do perfil do usuario autenticado."""

    profile = _get_profile_for_user(user=user)
    if not profile:
        return ServiceResponse.fail("Perfil do usuario nao encontrado.")
    return ServiceResponse.ok(data={"profile": _serialize_profile(profile)})


@transaction.atomic
def update_my_profile_data(*, user, payload):
    """Atualiza os dados principais do proprio perfil autenticado."""

    profile = _get_profile_for_user(user=user)
    if not profile:
        return ServiceResponse.fail("Perfil do usuario nao encontrado.")

    payload = dict(payload or {})
    try:
        validate_profile_completion_data(profile_data=payload)
    except ValidationError as exc:
        return ServiceResponse.fail(str(exc))

    phone_value = payload.get("phone")
    if phone_value is not None:
        phone_validation = _validate_phone_update(profile=profile, phone=phone_value)
        if not phone_validation.success:
            return phone_validation
        phone = getattr(profile, "phone", None)
        if phone is None:
            Phone.objects.create(profile=profile, number=phone_validation.data["contact_number"])
        else:
            phone.number = phone_validation.data["contact_number"]
            phone.save(update_fields=["number"])

    user_instance = profile.user
    if payload.get("email") is not None:
        user_instance.email = str(payload.get("email") or "").strip()
        user_instance.save(update_fields=["email"])

    changed_profile_fields = []
    for field in ["full_name", "mother_name", "gender", "marital_status", "education_level"]:
        if field not in payload or payload[field] is None:
            continue
        value = str(payload[field] or "").strip()
        if getattr(profile, field) != value:
            setattr(profile, field, value)
            changed_profile_fields.append(field)
    if "date_of_birth" in payload and payload["date_of_birth"] != profile.date_of_birth:
        profile.date_of_birth = payload["date_of_birth"]
        changed_profile_fields.append("date_of_birth")
    if changed_profile_fields:
        profile.save(update_fields=changed_profile_fields)

    profile.refresh_from_db()
    return ServiceResponse.ok(data={"profile": _serialize_profile(profile)})


def get_my_profile_address(*, user):
    """Retorna apenas o endereco do usuario autenticado."""

    profile = _get_profile_for_user(user=user)
    if not profile:
        return ServiceResponse.fail("Perfil do usuario nao encontrado.")
    return ServiceResponse.ok(
        data={
            "address": _serialize_address(profile.address),
        }
    )


@transaction.atomic
def update_my_profile_address(*, user, payload):
    """Atualiza apenas o endereco do usuario autenticado."""

    profile = _get_profile_for_user(user=user)
    if not profile:
        return ServiceResponse.fail("Perfil do usuario nao encontrado.")

    address_response = _update_address(profile=profile, address_data=payload)
    if not address_response.success:
        return address_response

    profile.refresh_from_db()
    return ServiceResponse.ok(data={"address": _serialize_address(profile.address)})
