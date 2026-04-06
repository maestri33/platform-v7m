"""API Ninja do domínio de visitantes."""

from typing import Literal

from ninja import Router, Schema
from ninja_jwt.authentication import JWTAuth
from pydantic import Field

from apps.visitors.models import VisitorStatus
from apps.visitors.services import (
    advance_my_visitor_status,
    create_presential_visitor,
    create_visitor,
    get_my_visitor_religious_data,
    get_visitor_status_for_user,
    login_visitor_with_status,
    register_visitor_and_send_otp,
    update_my_visitor_religious_data,
)

router = Router(tags=["visitors"])
ReligionOption = Literal[
    "christianity",
    "spiritism",
    "umbanda_candomble",
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


class CreateVisitorOutputSchema(Schema):
    message: str
    profile_uuid: str
    visitor_status: int
    reused_existing_profile: bool
    status: VisitorStatusPayloadSchema


class VisitorAuthOutputSchema(Schema):
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


class VisitorStatusOutputSchema(Schema):
    message: str
    status: VisitorStatusPayloadSchema


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
    status: VisitorStatusPayloadSchema | None = None
    missing_fields: list[str] = []


class VisitorAdvanceResponseSchema(Schema):
    message: str
    status: VisitorStatusPayloadSchema
    required_action: str = ""
    missing_fields: list[str] = []


@router.post("/register", response={201: CreateVisitorOutputSchema, 400: MessageSchema})
def create_visitor_endpoint(request, payload: CreateVisitorInputSchema):
    """Cadastra um novo visitante usando a fundação centralizada em perfis."""

    contact_number = str(payload.contact_number or payload.phone or "").strip()
    if not contact_number:
        return 400, {"message": "Numero de contato obrigatorio."}

    is_in_person = bool(payload.is_in_person)
    response = (
        create_presential_visitor(contact_number=contact_number)
        if is_in_person
        else create_visitor(contact_number=contact_number)
    )
    if not response.success:
        return 400, {"message": response.error}
    return 201, {
        "message": "Visitante presencial registrado com sucesso." if is_in_person else "Visitante registrado com sucesso.",
        "profile_uuid": response.data["profile_uuid"],
        "visitor_status": int(response.data["visitor_status"]),
        "reused_existing_profile": bool(response.data.get("reused_existing_profile")),
        "status": VisitorStatus.details_for(response.data["visitor_status"]),
    }


@router.post("/auth", response={200: VisitorAuthOutputSchema, 400: MessageSchema, 429: MessageSchema})
def visitor_auth_endpoint(request, payload: CreateVisitorInputSchema):
    """Registra/reaproveita visitante e dispara o fluxo de autenticacao por OTP."""

    contact_number = str(payload.contact_number or payload.phone or "").strip()
    if not contact_number:
        return 400, {"message": "Numero de contato obrigatorio."}

    response = register_visitor_and_send_otp(
        contact_number=contact_number,
        is_in_person=bool(payload.is_in_person),
    )
    if not response.success:
        return int(response.meta.get("status_code") or 400), {"message": response.error}
    return 200, {
        "message": "Codigo de verificacao enviado com sucesso.",
        **response.data,
    }


@router.post("/login", response={200: VisitorLoginOutputSchema, 400: MessageSchema, 401: MessageSchema, 404: MessageSchema})
def visitor_login_endpoint(request, payload: VisitorLoginInputSchema):
    """Executa login do visitante e retorna também o status atual."""

    response = login_visitor_with_status(profile_uuid=payload.profile_uuid, otp=payload.otp)
    if not response.success:
        if response.error in {"Codigo de verificacao invalido.", "Codigo de verificacao expirado."}:
            return 401, {"message": response.error}
        if response.error in {"Perfil nao encontrado.", "Perfil do usuario nao encontrado.", "Visitante nao encontrado."}:
            return 404, {"message": response.error}
        return 400, {"message": response.error}
    return 200, {
        "message": "Login realizado com sucesso.",
        **response.data,
    }


@router.get("/me", auth=JWTAuth(), response={200: VisitorStatusOutputSchema, 404: MessageSchema})
def visitor_me_endpoint(request):
    """Retorna apenas o status do visitante autenticado."""

    response = get_visitor_status_for_user(user=request.auth)
    if not response.success:
        return 404, {"message": response.error}
    return 200, {
        "message": "Status do visitante carregado com sucesso.",
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
        "message": "Dados religiosos carregados com sucesso.",
        **response.data,
        "missing_fields": [],
        "status": None,
    }


@router.patch(
    "/religious-data",
    auth=JWTAuth(),
    response={200: VisitorReligiousDataResponseSchema, 400: MessageSchema, 404: MessageSchema},
)
def update_my_visitor_religious_data_endpoint(request, payload: VisitorReligiousDataUpdateSchema):
    """Atualiza os dados religiosos do visitante autenticado."""

    response = update_my_visitor_religious_data(user=request.auth, payload=payload.model_dump())
    if not response.success:
        status = 404 if response.error == "Visitante não encontrado." else 400
        return status, {"message": response.error}
    return 200, {
        "message": "Dados religiosos atualizados com sucesso.",
        **response.data,
    }


@router.post(
    "/update",
    auth=JWTAuth(),
    response={200: VisitorAdvanceResponseSchema, 400: VisitorAdvanceResponseSchema, 404: MessageSchema},
)
def advance_my_visitor_status_endpoint(request):
    """Avança o visitante para a próxima etapa quando os dados necessários já existirem."""

    response = advance_my_visitor_status(user=request.auth)
    if not response.success:
        if response.error in {"Perfil do usuário não encontrado.", "Visitante não encontrado."}:
            return 404, {"message": response.error}
        return 400, {
            "message": response.error,
            "status": response.meta.get("status") or {"code": 0, "label": "", "description": "", "required_action": ""},
            "required_action": (response.meta.get("status") or {}).get("required_action", ""),
            "missing_fields": response.meta.get("missing_fields", []),
        }
    return 200, {
        "message": "Etapa do visitante atualizada com sucesso.",
        **response.data,
    }
