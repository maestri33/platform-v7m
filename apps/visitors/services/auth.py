"""Fluxo combinado de registro + autenticacao para visitantes."""

from services.base import ServiceResponse

from .creation import create_presential_visitor, create_visitor

INVALID_PHONE_MESSAGES = {
    "Numero de contato invalido no WhatsApp.",
    "Numero de contato obrigatorio.",
}
EXISTING_PROFILE_MESSAGES = {
    "Numero de contato ja cadastrado no sistema.",
}


def register_visitor_and_send_otp(*, contact_number, is_in_person=False):
    """Registra/reaproveita o visitante e dispara o mesmo fluxo do auth/check."""

    from apps.authentication.services import auth_check

    response = (
        create_presential_visitor(contact_number=contact_number)
        if is_in_person
        else create_visitor(contact_number=contact_number)
    )
    if response.success:
        return auth_check(phone=contact_number)

    if response.error in INVALID_PHONE_MESSAGES:
        return ServiceResponse.fail("O numero informado nao e valido.")

    if response.error in EXISTING_PROFILE_MESSAGES:
        normalized_phone = str(response.meta.get("phone") or contact_number or "").strip()
        return auth_check(phone=normalized_phone)

    return response


def login_visitor_with_status(*, profile_uuid, otp):
    """Executa login e devolve junto o status atual do visitante."""

    from apps.authentication.services import login_with_profile_uuid_otp
    from apps.profiles.services import get_profile_by_uuid
    from .status import get_visitor_status_for_user

    profile = get_profile_by_uuid(profile_uuid=profile_uuid)
    if not profile:
        return ServiceResponse.fail("Perfil nao encontrado.")
    if not getattr(profile, "visitor", None):
        return ServiceResponse.fail("Visitante nao encontrado.")

    login_response = login_with_profile_uuid_otp(profile_uuid=profile_uuid, otp=otp)
    if not login_response.success:
        return login_response

    status_response = get_visitor_status_for_user(user=profile.user)
    if not status_response.success:
        return status_response

    return ServiceResponse.ok(
        data={
            **(login_response.data or {}),
            **(status_response.data or {}),
        }
    )
