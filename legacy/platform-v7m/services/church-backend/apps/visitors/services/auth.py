"""Fluxo combinado de registro + autenticacao para visitantes."""

from apps.visitors.models import VisitorStatus
from services.base import ServiceResponse

from .creation import create_presential_visitor, create_visitor

INVALID_PHONE_MESSAGES = {
    "Este número de whatsapp não funcionou...",
    "Preciso que informe um número de whatsapp...",
    "Numero de contato invalido no WhatsApp.",
}
EXISTING_PROFILE_MESSAGES = {
    "Numero de contato ja cadastrado no sistema.",
}


def authenticate_visitor_by_phone(*, contact_number, is_in_person=False):
    """Cria/reaproveita o visitante e dispara o envio do OTP de autenticacao."""

    from apps.authentication.services import auth_check

    response = (
        create_presential_visitor(contact_number=contact_number)
        if is_in_person
        else create_visitor(contact_number=contact_number)
    )
    if response.success:
        return auth_check(phone=contact_number)

    if response.error in INVALID_PHONE_MESSAGES:
        return ServiceResponse.fail("O numero informado nao e valido.", status_code=400)

    if response.error in EXISTING_PROFILE_MESSAGES:
        normalized_phone = str(response.meta.get("phone") or contact_number or "").strip()
        return auth_check(phone=normalized_phone)

    return response


def login_visitor_with_status(*, profile_uuid, otp):
    """Executa login e devolve junto o status atual do visitante."""

    from apps.authentication.services import login_with_profile_uuid_otp
    from apps.profiles.services import get_profile_by_uuid

    profile = get_profile_by_uuid(profile_uuid=profile_uuid)
    if not profile:
        return ServiceResponse.fail("Perfil nao encontrado.")
    if not getattr(profile, "visitor", None):
        return ServiceResponse.fail("Visitante nao encontrado.")

    login_response = login_with_profile_uuid_otp(profile_uuid=profile_uuid, otp=otp)
    if not login_response.success:
        return login_response

    return ServiceResponse.ok(
        data={
            **(login_response.data or {}),
            "status": VisitorStatus.details_for(profile.visitor.status),
        }
    )


def refresh_visitor_tokens(*, refresh):
    """Renova o par de tokens JWT usado pelo frontend do fluxo de visitantes."""

    from apps.authentication.services import refresh_token_pair

    return refresh_token_pair(refresh=refresh)
