"""API Ninja do domínio de visitantes."""

from ninja import Router, Schema
from ninja_jwt.authentication import JWTAuth

from apps.visitors.services import (
    advance_my_visitor_status,
    create_presential_visitor,
    create_visitor,
    get_my_visitor_religious_data,
    get_visitor_status_for_user,
    update_my_visitor_religious_data,
)

router = Router(tags=["visitors"])


class MessageSchema(Schema):
    message: str


class CreateVisitorInputSchema(Schema):
    contact_number: str
    is_in_person: str = "no"


class CreateVisitorOutputSchema(Schema):
    message: str
    profile_uuid: str
    visitor_status: int


class VisitorStatusPayloadSchema(Schema):
    code: int
    label: str
    description: str
    required_action: str


class VisitorStatusOutputSchema(Schema):
    message: str
    status: VisitorStatusPayloadSchema


class VisitorReligiousDataSchema(Schema):
    religion: str = ""
    christianity_type: str = ""
    evangelical_church_name: str = ""
    evangelical_is_in_communion: bool | None = None


class VisitorReligiousDataUpdateSchema(Schema):
    religion: str | None = None
    christianity_type: str | None = None
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
    missing_fields: list[str] = []


@router.post("/register", response={201: CreateVisitorOutputSchema, 400: MessageSchema, 409: MessageSchema})
def create_visitor_endpoint(request, payload: CreateVisitorInputSchema):
    """Cadastra um novo visitante usando a fundação centralizada em perfis."""

    is_in_person = str(payload.is_in_person or "").strip().lower() == "yes"
    response = (
        create_presential_visitor(contact_number=payload.contact_number)
        if is_in_person
        else create_visitor(contact_number=payload.contact_number)
    )
    if not response.success:
        if not is_in_person and response.error == "Número de contato já cadastrado no sistema.":
            return 409, {"message": response.error}
        return 400, {"message": response.error}
    return 201, {
        "message": "Visitante presencial registrado com sucesso." if is_in_person else "Visitante cadastrado com sucesso.",
        "profile_uuid": response.data["profile_uuid"],
        "visitor_status": response.data["visitor_status"],
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
            "missing_fields": response.meta.get("missing_fields", []),
        }
    return 200, {
        "message": "Etapa do visitante atualizada com sucesso.",
        **response.data,
    }
