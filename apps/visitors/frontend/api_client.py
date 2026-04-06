"""Adapters locais para o frontend consumir a API de visitors."""

import json
from dataclasses import dataclass, field

from django.http import JsonResponse

from apps.visitors import api as visitors_api


@dataclass
class FrontendApiResponse:
    success: bool
    data: dict = field(default_factory=dict)
    error: str = ""
    meta: dict = field(default_factory=dict)

    @classmethod
    def ok(cls, data=None, **meta):
        return cls(success=True, data=data or {}, meta=meta)

    @classmethod
    def fail(cls, error, **meta):
        return cls(success=False, error=str(error or ""), meta=meta)


def _normalize_endpoint_result(result):
    if isinstance(result, JsonResponse):
        status_code = int(result.status_code or 0)
        try:
            payload = json.loads(result.content.decode("utf-8")) if result.content else {}
        except (TypeError, ValueError, UnicodeDecodeError):
            payload = {"message": "Resposta invalida da API."}
        return status_code, payload

    if isinstance(result, tuple) and len(result) == 2 and isinstance(result[0], int):
        status_code, payload = result
        return int(status_code), dict(payload or {})

    return 200, dict(result or {})


def _to_service_response(result):
    status_code, payload = _normalize_endpoint_result(result)
    payload = dict(payload or {})
    message = str(payload.pop("message", "") or "").strip()

    if 200 <= status_code < 300:
        return FrontendApiResponse.ok(data=payload, message=message, status_code=status_code)

    return FrontendApiResponse.fail(message or "Falha ao executar operacao.", status_code=status_code, payload=payload)


def _call_endpoint(endpoint, request, payload=None, *, auth_user=None):
    inner = getattr(endpoint, "__wrapped__", endpoint)
    previous_auth = getattr(request, "auth", None)
    request.auth = auth_user
    try:
        if payload is None:
            return _to_service_response(inner(request))
        return _to_service_response(inner(request, payload))
    finally:
        request.auth = previous_auth


def authenticate_visitor(request, *, phone, contact_number="", is_in_person=False):
    payload = visitors_api.CreateVisitorInputSchema(
        phone=phone or None,
        contact_number=contact_number or None,
        is_in_person=bool(is_in_person),
    )
    return _call_endpoint(visitors_api.visitor_authentication_endpoint, request, payload)


def login_visitor(request, *, profile_uuid, otp):
    payload = visitors_api.VisitorLoginInputSchema(profile_uuid=profile_uuid, otp=otp)
    return _call_endpoint(visitors_api.visitor_login_endpoint, request, payload)


def get_profile_data(request, *, user):
    return _call_endpoint(visitors_api.get_my_visitor_profile_data_endpoint, request, auth_user=user)


def save_profile_data(request, *, user, payload):
    schema = visitors_api.VisitorProfileDataInputSchema(**payload)
    return _call_endpoint(visitors_api.save_my_visitor_profile_data_endpoint, request, schema, auth_user=user)


def get_address(request, *, user):
    return _call_endpoint(visitors_api.get_my_visitor_address_endpoint, request, auth_user=user)


def save_address(request, *, user, payload):
    schema = visitors_api.VisitorAddressInputSchema(**payload)
    return _call_endpoint(visitors_api.save_my_visitor_address_endpoint, request, schema, auth_user=user)


def get_religious_data(request, *, user):
    return _call_endpoint(visitors_api.get_my_visitor_religious_data_endpoint, request, auth_user=user)


def update_religious_data(request, *, user, payload):
    schema = visitors_api.VisitorReligiousDataUpdateSchema(**payload)
    return _call_endpoint(visitors_api.update_my_visitor_religious_data_endpoint, request, schema, auth_user=user)
