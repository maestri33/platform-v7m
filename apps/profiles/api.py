"""API Ninja do app profiles."""

from datetime import date
from typing import Literal

from ninja import Router, Schema
from ninja_jwt.authentication import JWTAuth

from apps.profiles.services import (
    get_my_profile,
    get_my_profile_address,
    update_my_profile_address,
    update_my_profile_data,
)

router = Router(tags=["profiles"])

GenderOption = Literal["female", "male"]
MaritalStatusOption = Literal["single", "married", "divorced", "widowed", "stable_union", "not_informed"]
EducationLevelOption = Literal[
    "incomplete_elementary",
    "complete_elementary",
    "incomplete_high_school",
    "complete_high_school",
    "incomplete_college",
    "complete_college",
    "postgraduate",
    "master",
    "doctorate",
    "not_informed",
]
StateOption = Literal[
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]


class MessageSchema(Schema):
    message: str


class AddressSchema(Schema):
    zipcode: str = ""
    street: str = ""
    number: str = ""
    complement: str = ""
    neighborhood: str = ""
    city: str = ""
    state: str = ""
    country: str = ""


class AddressUpdateSchema(Schema):
    zipcode: str | None = None
    street: str | None = None
    number: str | None = None
    complement: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: StateOption | None = None
    country: str | None = None


class ProfileDataSchema(Schema):
    profile_uuid: str
    full_name: str
    email: str
    phone: str
    date_of_birth: date | None = None
    mother_name: str
    gender: str
    marital_status: str
    education_level: str


class ProfileResponseSchema(Schema):
    message: str
    profile: ProfileDataSchema


class ProfileUpdateInputSchema(Schema):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    mother_name: str | None = None
    gender: GenderOption | None = None
    marital_status: MaritalStatusOption | None = None
    education_level: EducationLevelOption | None = None


class AddressResponseSchema(Schema):
    message: str
    address: AddressSchema | None = None


@router.get("", auth=JWTAuth(), response={200: ProfileResponseSchema, 404: MessageSchema})
def get_my_profile_endpoint(request):
    """Retorna somente as informacoes do proprio perfil."""

    response = get_my_profile(user=request.auth)
    if not response.success:
        return 404, {"message": response.error}
    return 200, {
        "message": "Perfil carregado com sucesso.",
        **response.data,
    }


@router.patch(
    "/data",
    auth=JWTAuth(),
    response={200: ProfileResponseSchema, 400: MessageSchema, 404: MessageSchema, 409: MessageSchema},
)
def update_my_profile_endpoint(request, payload: ProfileUpdateInputSchema):
    """Edita somente as informacoes do proprio perfil."""

    response = update_my_profile_data(user=request.auth, payload=payload.model_dump())
    if not response.success:
        if response.error == "Perfil do usuario nao encontrado.":
            status = 404
        else:
            status = int(response.meta.get("status_code") or 400)
        return status, {"message": response.error}
    return 200, {
        "message": "Perfil atualizado com sucesso.",
        **response.data,
    }


@router.get("/address", auth=JWTAuth(), response={200: AddressResponseSchema, 404: MessageSchema})
def get_my_profile_address_endpoint(request):
    """Retorna somente o endereco do proprio perfil."""

    response = get_my_profile_address(user=request.auth)
    if not response.success:
        return 404, {"message": response.error}
    return 200, {
        "message": "Endereco carregado com sucesso.",
        **response.data,
    }


@router.patch("/address", auth=JWTAuth(), response={200: AddressResponseSchema, 400: MessageSchema, 404: MessageSchema})
def update_my_profile_address_endpoint(request, payload: AddressUpdateSchema):
    """Edita somente o endereco do proprio perfil."""

    response = update_my_profile_address(user=request.auth, payload=payload.model_dump())
    if not response.success:
        status = 404 if response.error == "Perfil do usuario nao encontrado." else 400
        return status, {"message": response.error}
    return 200, {
        "message": "Endereco atualizado com sucesso.",
        **response.data,
    }
