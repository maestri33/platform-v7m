"""api/errors.py — Handlers globais de exceção e schema padronizado de erro."""

from __future__ import annotations

from typing import Any

import structlog
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.http import JsonResponse
from ninja import Schema
from ninja.errors import HttpError, ValidationError

logger = structlog.get_logger()


class ErrorDetail(Schema):
    location: list[str] | None = None
    message: str
    type: str | None = None


class ErrorOut(Schema):
    detail: str | list[dict[str, Any]]
    code: str | None = None


class BusinessError(Exception):
    """Exceção base para regras de negócio violadas na camada de domínio."""

    def __init__(self, message: str, code: str = "business_error", status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


def register_exception_handlers(api) -> None:
    """Registra os handlers globais de erro unificados no NinjaAPI."""

    @api.exception_handler(HttpError)
    def on_http_error(request, exc: HttpError):
        return JsonResponse({"detail": exc.message}, status=exc.status_code)

    @api.exception_handler(ValidationError)
    def on_validation_error(request, exc: ValidationError):
        return JsonResponse({"detail": exc.errors}, status=422)

    @api.exception_handler(BusinessError)
    def on_business_error(request, exc: BusinessError):
        logger.warning("api.business_error", path=request.path, code=exc.code, error=exc.message)
        return JsonResponse({"detail": exc.message, "code": exc.code}, status=exc.status_code)

    @api.exception_handler(ValueError)
    def on_value_error(request, exc: ValueError):
        logger.warning("api.value_error", path=request.path, error=str(exc))
        return JsonResponse({"detail": str(exc), "code": "invalid_argument"}, status=400)

    @api.exception_handler(ObjectDoesNotExist)
    def on_not_found(request, exc: ObjectDoesNotExist):
        return JsonResponse({"detail": "Recurso não encontrado.", "code": "not_found"}, status=404)

    @api.exception_handler(PermissionDenied)
    def on_permission_denied(request, exc: PermissionDenied):
        return JsonResponse({"detail": str(exc) or "Acesso negado.", "code": "forbidden"}, status=403)
