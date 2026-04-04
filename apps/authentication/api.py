"""API Ninja do app authentication."""

from ninja import Router, Schema
from pydantic import Field

from apps.authentication.services import (
    auth_check,
    login_with_profile_uuid_otp,
)

router = Router(tags=["auth"])


class MessageSchema(Schema):
    message: str


class AuthCheckInputSchema(Schema):
    phone: str | None = Field(default=None, description="Campo canônico de telefone.")
    contact_number: str | None = Field(
        default=None,
        description="Campo legado de compatibilidade. Use `phone`.",
        deprecated=True,
    )


class AuthCheckOutputSchema(Schema):
    message: str
    first_name: str
    profile_uuid: str
    magic_link: str
    is_visitor: bool


class AuthLoginInputSchema(Schema):
    profile_uuid: str
    otp: str


class AuthLoginOutputSchema(Schema):
    message: str
    access: str
    refresh: str
    is_visitor: bool


@router.post("/check", response={200: AuthCheckOutputSchema, 400: MessageSchema, 429: MessageSchema})
def auth_check_endpoint(request, payload: AuthCheckInputSchema):
    """Dispara OTP para o telefone informado se houver contexto de acesso."""

    phone = str(payload.phone or payload.contact_number or "").strip()
    if not phone:
        return 400, {"message": "Numero de contato obrigatorio."}

    response = auth_check(phone=phone)
    if not response.success:
        return int(response.meta.get("status_code") or 400), {"message": response.error}
    return 200, {
        "message": "Codigo de verificacao enviado com sucesso.",
        **response.data,
    }


@router.post("/login", response={200: AuthLoginOutputSchema, 400: MessageSchema, 401: MessageSchema})
def auth_login_endpoint(request, payload: AuthLoginInputSchema):
    """Realiza login por uuid do profile + OTP e emite JWT."""

    response = login_with_profile_uuid_otp(profile_uuid=payload.profile_uuid, otp=payload.otp)
    if not response.success:
        if response.error in {"Codigo de verificacao invalido.", "Codigo de verificacao expirado."}:
            return 401, {"message": response.error}
        return 400, {"message": response.error}
    return 200, {
        "message": "Login realizado com sucesso.",
        **response.data,
    }
