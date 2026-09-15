"""
MPP Payment Discovery — Machine Payment Protocol OpenAPI document.

Implements:
- /openapi.json per https://mpp.dev
- draft-payment-discovery-00 (https://paymentauth.org/draft-payment-discovery-00.txt)

Allows autonomous AI agents to discover payable endpoints via ``x-payment-info``
extensions in a standard OpenAPI 3.1.0 document served at the site root.
"""

from __future__ import annotations

import json
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods


# ---------------------------------------------------------------------------
# Payment metadata constants
# ---------------------------------------------------------------------------

ENROLLMENT_FEE_AMOUNT = "147.00"
ENROLLMENT_FEE_CURRENCY = "BRL"

SERVICE_INFO = {
    "name": "V7M Education Platform API",
    "description": (
        "API da Plataforma V7M / Supletivo Brasil para Matrícula "
        "e Certificação EJA"
    ),
    "categories": ["education", "payments", "e-commerce"],
    "documentation": "https://maestri.group",
}

# Operations that accept payment — each gets an x-payment-info extension.
PAYABLE_OPERATIONS: list[dict] = [
    {
        "path": "/api/v1/clients/lead/checkout",
        "method": "post",
        "operation_id": "clients_lead_checkout",
        "summary": "Iniciar checkout de matrícula",
        "description": "Cria sessão de pagamento para matrícula EJA.",
        "tags": ["checkout"],
        "x_payment_info": {
            "intent": "charge",
            "method": "card",
            "amount": ENROLLMENT_FEE_AMOUNT,
            "currency": ENROLLMENT_FEE_CURRENCY,
            "description": "Taxa de Matrícula Supletivo — EJA Ensino Médio",
            "offers": [
                {
                    "intent": "charge",
                    "method": "card",
                    "amount": ENROLLMENT_FEE_AMOUNT,
                    "currency": ENROLLMENT_FEE_CURRENCY,
                    "description": "Pagamento com Cartão de Crédito",
                },
                {
                    "intent": "charge",
                    "method": "stripe",
                    "amount": ENROLLMENT_FEE_AMOUNT,
                    "currency": ENROLLMENT_FEE_CURRENCY,
                    "description": "Pagamento online via Stripe",
                },
            ],
        },
    },
    {
        "path": "/api/v1/clients/lead/checkout-url",
        "method": "get",
        "operation_id": "clients_lead_checkout_url",
        "summary": "Obter URL de checkout",
        "description": "Retorna URL do gateway de pagamento para matrícula.",
        "tags": ["checkout"],
        "x_payment_info": {
            "intent": "session",
            "method": "card",
            "amount": ENROLLMENT_FEE_AMOUNT,
            "currency": ENROLLMENT_FEE_CURRENCY,
            "description": "URL de sessão de pagamento para matrícula",
        },
    },
    {
        "path": "/api/v1/leadership/enrollments/{external_id}/fee/pay",
        "method": "post",
        "operation_id": "leadership_enrollment_fee_pay",
        "summary": "Registrar pagamento de taxa",
        "description": "Registra pagamento manual de taxa de matrícula.",
        "tags": ["enrollments", "payments"],
        "x_payment_info": {
            "intent": "charge",
            "method": "card",
            "amount": ENROLLMENT_FEE_AMOUNT,
            "currency": ENROLLMENT_FEE_CURRENCY,
            "description": "Taxa de Matrícula — Pagamento pelo Polo",
        },
    },
    {
        "path": "/lead/checkout/{token}",
        "method": "get",
        "operation_id": "lead_checkout_redirect",
        "summary": "Redirect para checkout",
        "description": "Link curto que redireciona ao gateway de pagamento.",
        "tags": ["checkout"],
        "x_payment_info": {
            "intent": "session",
            "method": "card",
            "amount": ENROLLMENT_FEE_AMOUNT,
            "currency": ENROLLMENT_FEE_CURRENCY,
            "description": "Redirect para gateway de pagamento",
        },
    },
]


def _build_openapi_document(base_url: str) -> dict:
    """Build the OpenAPI 3.1.0 document with x-payment-info and x-service-info."""
    paths: dict = {}

    for op in PAYABLE_OPERATIONS:
        path_key = op["path"]
        method = op["method"]

        operation_obj: dict = {
            "operationId": op["operation_id"],
            "summary": op["summary"],
            "description": op["description"],
            "tags": op.get("tags", []),
            "x-payment-info": op["x_payment_info"],
            "responses": {
                "200": {"description": "OK"},
                "402": {"description": "Payment Required"},
            },
        }

        if path_key not in paths:
            paths[path_key] = {}
        paths[path_key][method] = operation_obj

    document = {
        "openapi": "3.1.0",
        "info": {
            "title": "V7M Payment Discovery API",
            "version": "1.0.0",
            "description": SERVICE_INFO["description"],
        },
        "x-service-info": SERVICE_INFO,
        "servers": [{"url": base_url}],
        "paths": paths,
    }

    return document


def _get_base_url(request: HttpRequest) -> str:
    """Resolve the canonical base URL from request or forwarded headers."""
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")
    if forwarded_proto and forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}".rstrip("/")
    return request.build_absolute_uri("/").rstrip("/")


@require_http_methods(["GET", "HEAD", "OPTIONS"])
def openapi_discovery_view(request: HttpRequest) -> HttpResponse:
    """
    Serve /openapi.json at the site root with HTTP 200.

    Returns an OpenAPI 3.1.0 document with:
    - Top-level ``x-service-info`` (name, description, categories)
    - ``x-payment-info`` extensions on all payable operations
    - CORS headers for cross-origin agent discovery
    """
    if request.method == "OPTIONS":
        response = HttpResponse(status=204)
    else:
        base_url = _get_base_url(request)
        document = _build_openapi_document(base_url)
        body = json.dumps(document, indent=2, ensure_ascii=False)
        response = HttpResponse(body, content_type="application/json; charset=utf-8")
        response["Cache-Control"] = "public, max-age=3600"

    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    return response
