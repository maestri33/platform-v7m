"""Fluxos iniciais de criacao de usuario/perfil."""

from django.contrib.auth import get_user_model
from django.db import transaction

from apps.profiles.models import Phone, Profile

from .contacts import get_profile_by_phone
from services.base import ServiceResponse
from services.communication.whatsapp_validation import validate_number

User = get_user_model()


def _digits(value):
    """Extrai somente digitos do numero informado."""

    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _split_full_name(full_name):
    """Separa o nome completo em primeiro nome e sobrenome."""

    parts = [item for item in str(full_name or "").strip().split(" ") if item]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[-1]


def _build_username(contact_number):
    """Gera um username estavel e unico a partir do telefone."""

    base = _digits(contact_number) or "user"
    candidate = base
    suffix = 1
    while User.objects.filter(username=candidate).exists():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def _validate_contact_number_for_creation(*, contact_number):
    """Valida se o telefone pode ser usado num novo cadastro."""

    normalized_number = _digits(contact_number)
    if not normalized_number:
        return ServiceResponse.fail("Numero de contato obrigatorio.")

    existing_profile = get_profile_by_phone(phone=normalized_number)
    if existing_profile:
        return ServiceResponse.fail(
            "Numero de contato ja cadastrado no sistema.",
            phone=normalized_number,
            profile_id=existing_profile.id,
            user_id=existing_profile.user_id,
        )

    validation = validate_number(normalized_number)
    if not validation.get("success"):
        return ServiceResponse.fail(
            "Numero de contato invalido no WhatsApp.",
            status_code=validation.get("status_code"),
            provider_data=validation.get("data", {}),
        )

    provider_data = validation.get("data", {})
    return ServiceResponse.ok(
        data={
            "contact_number": provider_data.get("number") or normalized_number,
            "jid": provider_data.get("jid", ""),
            "display_name": provider_data.get("name", ""),
            "exists": bool(provider_data.get("exists")),
        },
        status_code=validation.get("status_code"),
    )


def validate_contact_number_for_new_profile(*, contact_number):
    """Valida o telefone informado antes da criacao de um novo perfil."""

    return _validate_contact_number_for_creation(contact_number=contact_number)


def validate_contact_number_for_new_user(*, contact_number):
    """Valida o telefone informado antes da criacao de um novo usuario."""

    return _validate_contact_number_for_creation(contact_number=contact_number)


@transaction.atomic
def create_user_profile_with_contact(*, contact_number, full_name="", email=""):
    """Cria a base comum de User + Profile + Phone sem duplicar regras."""

    normalized_name = str(full_name or "").strip()
    validation = _validate_contact_number_for_creation(contact_number=contact_number)
    if not validation.success:
        return validation

    stored_contact_number = validation.data["contact_number"]
    first_name, last_name = _split_full_name(normalized_name)
    user = User.objects.create_user(
        username=_build_username(stored_contact_number),
        email=str(email or "").strip(),
        first_name=first_name,
        last_name=last_name,
        password=None,
    )
    profile = Profile.objects.create(
        user=user,
        full_name=normalized_name,
    )
    phone = Phone.objects.create(
        profile=profile,
        number=stored_contact_number,
    )

    return ServiceResponse.ok(
        data={
            "user_id": user.id,
            "profile_id": profile.id,
            "profile_uuid": str(profile.uuid),
            "phone_id": phone.id,
            "contact_number": phone.number,
            "email": user.email or "",
            "full_name": profile.full_name,
            "first_name": user.first_name or first_name,
            "last_name": user.last_name or last_name,
            "jid": validation.data.get("jid", ""),
            "display_name": validation.data.get("display_name", ""),
            "exists": validation.data.get("exists", False),
        }
    )
