"""API Ninja do domínio de visitantes."""

import json
import time
from datetime import date
from functools import wraps
from typing import Literal
from uuid import UUID

from django.http import JsonResponse
from ninja import Router, Schema
from ninja_jwt.authentication import JWTAuth
from pydantic import Field

from apps.profiles.models import GenderChoices, MaritalStatusChoices, StateChoices
from apps.visitors.messages import (
    AUTHENTICATION_SUCCESS_MESSAGE,
    LOGIN_SUCCESS_MESSAGE,
    REFRESH_SUCCESS_MESSAGE,
)
from apps.visitors.models import ChristianityTypeChoices, ReligionChoices, create_visitor_api_log
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
MAX_LOG_TEXT_LENGTH = 2000
REDACTED_LOG_VALUE = "<REDACTED>"
SENSITIVE_LOG_KEYS = {
    "access",
    "authorization",
    "frontend_link",
    "magic_link",
    "otp",
    "refresh",
}


def _truncate_log_text(value, limit=MAX_LOG_TEXT_LENGTH):
    text = str(value or "")
    if len(text) <= limit:
        return text
    return f"{text[:limit]}... <TRUNCATED:{len(text)}>"


def _sanitize_log_value(value, *, key_name=""):
    normalized_key = str(key_name or "").strip().lower()
    if normalized_key in SENSITIVE_LOG_KEYS:
        return REDACTED_LOG_VALUE
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, (date, UUID)):
        return str(value)
    if isinstance(value, str):
        return _truncate_log_text(value)
    if isinstance(value, dict):
        return {
            str(key): _sanitize_log_value(item, key_name=str(key))
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple, set)):
        return [_sanitize_log_value(item, key_name=key_name) for item in value]
    if hasattr(value, "model_dump"):
        return _sanitize_log_value(value.model_dump(), key_name=key_name)
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except TypeError:
            pass
    return _truncate_log_text(value)


def _extract_api_payload(args, kwargs):
    payload = kwargs.get("payload")
    if payload is not None:
        return _sanitize_log_value(payload)
    if len(args) >= 2:
        return _sanitize_log_value(args[1])
    return None


def _extract_authenticated_identity(request):
    auth_user = getattr(request, "auth", None)
    if not auth_user:
        return None, None
    profile = getattr(auth_user, "profile", None)
    profile_uuid = getattr(profile, "uuid", None)
    return getattr(auth_user, "id", None), str(profile_uuid) if profile_uuid else None


def _extract_response_details(result):
    if isinstance(result, JsonResponse):
        status_code = result.status_code
        try:
            response_data = json.loads(result.content.decode("utf-8")) if result.content else {}
        except (TypeError, ValueError, UnicodeDecodeError):
            response_data = {"raw_text": _truncate_log_text(getattr(result, "content", b""))}
        response_text = _truncate_log_text(result.content.decode("utf-8")) if result.content else ""
        return status_code, response_data, response_text

    if isinstance(result, tuple) and len(result) == 2 and isinstance(result[0], int):
        status_code, payload = result
        sanitized = _sanitize_log_value(payload)
        return int(status_code), sanitized, _truncate_log_text(json.dumps(sanitized, ensure_ascii=False, default=str))

    sanitized = _sanitize_log_value(result)
    return 200, sanitized, _truncate_log_text(json.dumps(sanitized, ensure_ascii=False, default=str))


def _log_visitor_api_call(operation):
    """Loga request/response dos endpoints sem alterar seu contrato."""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            request = args[0]
            started_at = time.monotonic()
            user_id, profile_uuid = _extract_authenticated_identity(request)
            request_data = _extract_api_payload(args, kwargs)

            try:
                result = func(*args, **kwargs)
                status_code, response_data, response_text = _extract_response_details(result)
                create_visitor_api_log(
                    operation=operation,
                    request_method=str(getattr(request, "method", "") or "").upper(),
                    path=str(getattr(request, "path", "") or ""),
                    authenticated_user_id=user_id,
                    authenticated_profile_uuid=profile_uuid,
                    success=200 <= int(status_code or 0) < 300,
                    status_code=status_code,
                    duration_ms=int((time.monotonic() - started_at) * 1000),
                    request_data=request_data,
                    response_data=response_data,
                    response_text=response_text or None,
                )
                return result
            except Exception as exc:
                create_visitor_api_log(
                    operation=operation,
                    request_method=str(getattr(request, "method", "") or "").upper(),
                    path=str(getattr(request, "path", "") or ""),
                    authenticated_user_id=user_id,
                    authenticated_profile_uuid=profile_uuid,
                    success=False,
                    status_code=500,
                    duration_ms=int((time.monotonic() - started_at) * 1000),
                    request_data=request_data,
                    error_message=str(exc),
                    response_text=_truncate_log_text(exc),
                )
                raise

        return wrapper

    return decorator


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


class ChoiceOptionSchema(Schema):
    value: str
    label: str


class VisitorFormOptionsSchema(Schema):
    gender: list[ChoiceOptionSchema] = Field(default_factory=list)
    marital_status: list[ChoiceOptionSchema] = Field(default_factory=list)
    state: list[ChoiceOptionSchema] = Field(default_factory=list)
    religion: list[ChoiceOptionSchema] = Field(default_factory=list)
    christianity_type: list[ChoiceOptionSchema] = Field(default_factory=list)


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
    options: VisitorFormOptionsSchema | None = None


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
    options: VisitorFormOptionsSchema | None = None


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
    options: VisitorFormOptionsSchema | None = None


def _choice_options(choice_class):
    return [
        {
            "value": str(value),
            "label": str(label),
        }
        for value, label in choice_class.choices
    ]


def _profile_form_options():
    return {
        "gender": _choice_options(GenderChoices),
        "marital_status": _choice_options(MaritalStatusChoices),
    }


def _address_form_options():
    return {
        "state": _choice_options(StateChoices),
    }


def _religious_form_options():
    return {
        "religion": _choice_options(ReligionChoices),
        "christianity_type": _choice_options(ChristianityTypeChoices),
    }


@router.post("/authentication", response={200: VisitorAuthenticationOutputSchema, 400: MessageSchema, 429: MessageSchema})
@_log_visitor_api_call("visitors.authentication")
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
@_log_visitor_api_call("visitors.login")
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
@_log_visitor_api_call("visitors.refresh")
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
@_log_visitor_api_call("visitors.data.get")
def get_my_visitor_profile_data_endpoint(request):
    """Retorna os dados principais do visitante autenticado."""

    response = get_my_visitor_profile_data(user=request.auth)
    if not response.success:
        return 404, {"message": response.error}
    return 200, {
        "message": response.meta.get("message", "Confira se esses dados estão corretos..."),
        **response.data,
        "options": _profile_form_options(),
    }


@router.post(
    "/data",
    auth=JWTAuth(),
    response={200: VisitorProfileDataResponseSchema, 400: VisitorStepErrorResponseSchema, 404: MessageSchema, 409: MessageSchema},
)
@_log_visitor_api_call("visitors.data.post")
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
        "options": _profile_form_options(),
    }


@router.get("/address", auth=JWTAuth(), response={200: VisitorAddressResponseSchema, 404: MessageSchema})
@_log_visitor_api_call("visitors.address.get")
def get_my_visitor_address_endpoint(request):
    """Retorna o endereco do visitante autenticado."""

    response = get_my_visitor_address(user=request.auth)
    if not response.success:
        return 404, {"message": response.error}
    return 200, {
        "message": response.meta.get("message", "Confira se seu endereço está correto..."),
        **response.data,
        "options": _address_form_options(),
    }


@router.post(
    "/address",
    auth=JWTAuth(),
    response={200: VisitorAddressResponseSchema, 400: VisitorStepErrorResponseSchema, 404: MessageSchema},
)
@_log_visitor_api_call("visitors.address.post")
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
        "options": _address_form_options(),
    }


@router.get(
    "/religious-data",
    auth=JWTAuth(),
    response={200: VisitorReligiousDataResponseSchema, 404: MessageSchema},
)
@_log_visitor_api_call("visitors.religious_data.get")
def get_my_visitor_religious_data_endpoint(request):
    """Retorna os dados religiosos do visitante autenticado."""

    response = get_my_visitor_religious_data(user=request.auth)
    if not response.success:
        return 404, {"message": response.error}
    return 200, {
        "message": response.meta.get("message", "Veja se essas informações estão corretas..."),
        **response.data,
        "required_action": (response.data.get("status") or {}).get("required_action", ""),
        "options": _religious_form_options(),
    }


@router.post(
    "/religious-data",
    auth=JWTAuth(),
    response={200: VisitorReligiousDataResponseSchema, 400: VisitorStepErrorResponseSchema, 404: MessageSchema},
)
@_log_visitor_api_call("visitors.religious_data.post")
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
        "message": response.meta.get("message", "Dados sobre sua fé foram atualizados com sucesso."),
        **response.data,
        "required_action": (response.data.get("status") or {}).get("required_action", ""),
        "options": _religious_form_options(),
    }
