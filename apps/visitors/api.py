"""API Ninja do domínio de visitantes."""

from datetime import date
from typing import Literal

from django.http import JsonResponse
from ninja import Router, Schema
from ninja_jwt.authentication import JWTAuth
from pydantic import Field

from apps.visitors.messages import (
    AUTHENTICATION_SUCCESS_MESSAGE,
    LOGIN_SUCCESS_MESSAGE,
    REFRESH_SUCCESS_MESSAGE,
)
from apps.visitors.services import (
    authenticate_visitor_by_phone,
    get_my_visitor_address,
    get_my_visitor_profile_data,
    get_my_visitor_religious_data,
    login_visitor_with_status,
    refresh_visitor_tokens,
    save_my_visitor_address,
    save_my_visitor_profile_data,
    update_my_visitor_religious_data,
)

router = Router(tags=["visitors"])
ReligionOption = Literal[
    "christianity",
    "spiritism",
    "african_origin",
    "islam",
    "judaism",
    "buddhism",
    "no_religion",
    "other",
]
ChristianityTypeOption = Literal[
    "evangelical_protestant",
    "roman_catholic",
    "orthodox_catholic",
    "other",
]
GenderOption = Literal["female", "male"]
MaritalStatusOption = Literal["single", "married", "divorced", "widowed", "stable_union", "not_informed"]
StateOption = Literal[
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]


class MessageSchema(Schema):
    message: str


class CreateVisitorInputSchema(Schema):
    phone: str | None = Field(default=None, description="Campo canônico de telefone.")
    contact_number: str | None = Field(
        default=None,
        description="Campo legado de compatibilidade. Use `phone`.",
        deprecated=True,
    )
    is_in_person: bool = False


class VisitorStatusPayloadSchema(Schema):
    code: int
    label: str
    description: str
    required_action: str


class VisitorAuthenticationOutputSchema(Schema):
    message: str
    first_name: str
    profile_uuid: str
    magic_link: str
    is_visitor: bool


class VisitorLoginInputSchema(Schema):
    profile_uuid: str
    otp: str


class VisitorLoginOutputSchema(Schema):
    message: str
    access: str
    refresh: str
    is_visitor: bool
    status: VisitorStatusPayloadSchema


class VisitorRefreshInputSchema(Schema):
    refresh: str


class VisitorRefreshOutputSchema(Schema):
    message: str
    access: str
    refresh: str


class VisitorStepErrorResponseSchema(Schema):
    message: str
    status: VisitorStatusPayloadSchema
    required_action: str = ""
    missing_fields: list[str] = []


class VisitorProfileDataSchema(Schema):
    full_name: str = ""
    email: str = ""
    date_of_birth: date | None = None
    gender: str = ""
    marital_status: str = ""


class VisitorProfileDataInputSchema(Schema):
    full_name: str
    email: str | None = None
    date_of_birth: date
    gender: GenderOption
    marital_status: MaritalStatusOption


class VisitorProfileDataResponseSchema(Schema):
    message: str
    profile: VisitorProfileDataSchema
    status: VisitorStatusPayloadSchema
    required_action: str = ""
    missing_fields: list[str] = []


class VisitorAddressSchema(Schema):
    zipcode: str = ""
    street: str = ""
    number: str = ""
    complement: str = ""
    neighborhood: str = ""
    city: str = ""
    state: str = ""
    country: str = ""


class VisitorAddressInputSchema(Schema):
    zipcode: str
    street: str
    number: str
    complement: str | None = None
    neighborhood: str
    city: str
    state: StateOption
    country: str | None = None


class VisitorAddressResponseSchema(Schema):
    message: str
    address: VisitorAddressSchema | None = None
    status: VisitorStatusPayloadSchema
    required_action: str = ""
    missing_fields: list[str] = []


class VisitorReligiousDataSchema(Schema):
    religion: str = ""
    christianity_type: str = ""
    evangelical_church_name: str = ""
    evangelical_is_in_communion: bool | None = None


class VisitorReligiousDataUpdateSchema(Schema):
    religion: ReligionOption | None = None
    christianity_type: ChristianityTypeOption | None = None
    evangelical_church_name: str | None = None
    evangelical_is_in_communion: bool | None = None


class VisitorReligiousDataResponseSchema(Schema):
    message: str
    religious_data: VisitorReligiousDataSchema
    status: VisitorStatusPayloadSchema
    required_action: str = ""
    missing_fields: list[str] = []


@router.post("/authentication", response={200: VisitorAuthenticationOutputSchema, 400: MessageSchema, 429: MessageSchema})
def visitor_authentication_endpoint(request, payload: CreateVisitorInputSchema):
    """Registra/reaproveita visitante e dispara o fluxo de autenticacao por OTP."""

    contact_number = str(payload.contact_number or payload.phone or "").strip()
    if not contact_number:
        return 400, {"message": "Número de telefone é obrigatório."}

    response = authenticate_visitor_by_phone(
        contact_number=contact_number,
        is_in_person=bool(payload.is_in_person),
    )
    if not response.success:
        return int(response.meta.get("status_code") or 400), {"message": response.error}
    return 200, {
        "message": AUTHENTICATION_SUCCESS_MESSAGE,
        **response.data,
    }


@router.post("/login", response={200: VisitorLoginOutputSchema, 400: MessageSchema, 401: MessageSchema, 404: MessageSchema})
def visitor_login_endpoint(request, payload: VisitorLoginInputSchema):
    """Executa login do visitante e retorna também o status atual."""

    response = login_visitor_with_status(profile_uuid=payload.profile_uuid, otp=payload.otp)
    if not response.success:
        if response.error in {"Codigo de verificacao invalido.", "Codigo de verificacao expirado.", "Código de verificação inválido.", "Código de verificação expirado."}:
            return JsonResponse({"message": response.error}, status=401)
        if response.error in {"Perfil nao encontrado.", "Perfil do usuario nao encontrado.", "Visitante nao encontrado."}:
            return 404, {"message": response.error}
        return 400, {"message": response.error}
    return 200, {
        "message": LOGIN_SUCCESS_MESSAGE,
        **response.data,
    }


@router.post("/refresh", response={200: VisitorRefreshOutputSchema, 400: MessageSchema, 401: MessageSchema})
def visitor_refresh_endpoint(request, payload: VisitorRefreshInputSchema):
    """Atualiza o JWT do visitante a partir do refresh token."""

    response = refresh_visitor_tokens(refresh=payload.refresh)
    if not response.success:
        if response.error == "Refresh token invalido ou expirado.":
            return 401, {"message": response.error}
        return 400, {"message": response.error}
    return 200, {
        "message": REFRESH_SUCCESS_MESSAGE,
        **response.data,
    }


@router.get("/data", auth=JWTAuth(), response={200: VisitorProfileDataResponseSchema, 404: MessageSchema})
def get_my_visitor_profile_data_endpoint(request):
    """Retorna os dados principais do visitante autenticado."""

    response = get_my_visitor_profile_data(user=request.auth)
    if not response.success:
        return 404, {"message": response.error}
    return 200, {
        "message": response.meta.get("message", "Confira se esses dados estão corretos..."),
        **response.data,
    }


@router.post(
    "/data",
    auth=JWTAuth(),
    response={200: VisitorProfileDataResponseSchema, 400: VisitorStepErrorResponseSchema, 404: MessageSchema, 409: MessageSchema},
)
def save_my_visitor_profile_data_endpoint(request, payload: VisitorProfileDataInputSchema):
    """Salva os dados principais do visitante e avança a etapa quando aplicável."""

    response = save_my_visitor_profile_data(user=request.auth, payload=payload.model_dump())
    if not response.success:
        if response.error in {"Perfil do usuario nao encontrado.", "Visitante nao encontrado."}:
            return 404, {"message": response.error}
        status_code = int(response.meta.get("status_code") or 400)
        if status_code == 409:
            return 409, {"message": response.error}
        status = response.meta.get("status") or {"code": 0, "label": "", "description": "", "required_action": ""}
        return 400, {
            "message": response.error,
            "status": status,
            "required_action": status.get("required_action", ""),
            "missing_fields": response.meta.get("missing_fields", []),
        }
    return 200, {
        "message": response.meta.get("message", "Salvamos suas informações aqui..."),
        **response.data,
    }


@router.get("/address", auth=JWTAuth(), response={200: VisitorAddressResponseSchema, 404: MessageSchema})
def get_my_visitor_address_endpoint(request):
    """Retorna o endereco do visitante autenticado."""

    response = get_my_visitor_address(user=request.auth)
    if not response.success:
        return 404, {"message": response.error}
    return 200, {
        "message": response.meta.get("message", "Confira se seu endereço está correto..."),
        **response.data,
    }


@router.post(
    "/address",
    auth=JWTAuth(),
    response={200: VisitorAddressResponseSchema, 400: VisitorStepErrorResponseSchema, 404: MessageSchema},
)
def save_my_visitor_address_endpoint(request, payload: VisitorAddressInputSchema):
    """Salva o endereco do visitante e avança a etapa quando aplicável."""

    response = save_my_visitor_address(user=request.auth, payload=payload.model_dump())
    if not response.success:
        if response.error in {"Perfil do usuario nao encontrado.", "Visitante nao encontrado."}:
            return 404, {"message": response.error}
        status = response.meta.get("status") or {"code": 0, "label": "", "description": "", "required_action": ""}
        return 400, {
            "message": response.error,
            "status": status,
            "required_action": status.get("required_action", ""),
            "missing_fields": response.meta.get("missing_fields", []),
        }
    return 200, {
        "message": response.meta.get("message", "Ótimo, agora nós já sabemos onde te encontrar..."),
        **response.data,
    }


@router.get(
    "/religious-data",
    auth=JWTAuth(),
    response={200: VisitorReligiousDataResponseSchema, 404: MessageSchema},
)
def get_my_visitor_religious_data_endpoint(request):
    """Retorna os dados religiosos do visitante autenticado."""

    response = get_my_visitor_religious_data(user=request.auth)
    if not response.success:
        return 404, {"message": response.error}
    return 200, {
        "message": response.meta.get("message", "Veja se essas informacoes estao corretas..."),
        **response.data,
        "required_action": (response.data.get("status") or {}).get("required_action", ""),
    }


@router.post(
    "/religious-data",
    auth=JWTAuth(),
    response={200: VisitorReligiousDataResponseSchema, 400: VisitorStepErrorResponseSchema, 404: MessageSchema},
)
def update_my_visitor_religious_data_endpoint(request, payload: VisitorReligiousDataUpdateSchema):
    """Atualiza os dados religiosos do visitante autenticado."""

    response = update_my_visitor_religious_data(user=request.auth, payload=payload.model_dump())
    if not response.success:
        if response.error in {"Perfil do usuario nao encontrado.", "Visitante nao encontrado."}:
            return 404, {"message": response.error}
        status = response.meta.get("status") or {"code": 0, "label": "", "description": "", "required_action": ""}
        return 400, {
            "message": response.error,
            "status": status,
            "required_action": status.get("required_action", ""),
            "missing_fields": response.meta.get("missing_fields", []),
        }
    return 200, {
        "message": response.meta.get("message", "Dados religiosos atualizados com sucesso."),
        **response.data,
        "required_action": (response.data.get("status") or {}).get("required_action", ""),
    }
