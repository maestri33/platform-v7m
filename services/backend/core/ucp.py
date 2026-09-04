"""
Universal Commerce Protocol (UCP) Discovery Endpoint.

Implements:
- /.well-known/ucp per UCP Specification (https://ucp.dev/specification/overview/)
Allows AI agents to discover content payment protocols, services, and capabilities.
"""

from __future__ import annotations

from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

UCP_PROTOCOL_VERSION = "2026-08-25"
UCP_SPEC_URL = "https://ucp.dev/2026-08-25/specification/overview/"
UCP_CHECKOUT_SPEC_URL = "https://ucp.dev/2026-08-25/specification/shopping/checkout/"
UCP_REST_SCHEMA_URL = "https://ucp.dev/2026-08-25/services/shopping/rest.openapi.json"
UCP_CHECKOUT_SCHEMA_URL = "https://ucp.dev/2026-08-25/schemas/shopping/checkout.json"


def _get_base_url(request: HttpRequest) -> str:
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")
    if forwarded_proto and forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}".rstrip("/")
    return request.build_absolute_uri("/").rstrip("/")


@require_GET
def ucp_discovery_view(request: HttpRequest) -> JsonResponse:
    """
    Serve /.well-known/ucp JSON manifest.
    """
    base_url = _get_base_url(request)

    data = {
        "protocol_version": UCP_PROTOCOL_VERSION,
        "version": UCP_PROTOCOL_VERSION,
        "name": "V7M Platform Universal Commerce",
        "description": "Universal Commerce Protocol (UCP) endpoint for V7M educational enrollments, course checkout, and promoter payments.",
        "spec_url": UCP_SPEC_URL,
        "schema": UCP_REST_SCHEMA_URL,
        "services": [
            {
                "name": "checkout",
                "version": UCP_PROTOCOL_VERSION,
                "transport": "rest",
                "endpoint": f"{base_url}/api/v1/checkout",
                "spec_url": UCP_CHECKOUT_SPEC_URL,
                "schema": UCP_CHECKOUT_SCHEMA_URL,
            },
            {
                "name": "orders",
                "version": UCP_PROTOCOL_VERSION,
                "transport": "rest",
                "endpoint": f"{base_url}/api/v1/orders",
                "spec_url": UCP_SPEC_URL,
                "schema": UCP_REST_SCHEMA_URL,
            },
        ],
        "capabilities": {
            "dev.ucp.shopping.checkout": [
                {
                    "version": UCP_PROTOCOL_VERSION,
                    "spec": UCP_CHECKOUT_SPEC_URL,
                    "schema": UCP_CHECKOUT_SCHEMA_URL,
                }
            ],
            "supported_currencies": ["BRL"],
            "payment_methods": ["pix", "credit_card"],
            "instant_settlement": True,
        },
        "endpoints": {
            "base_url": base_url,
            "checkout": f"{base_url}/api/v1/checkout",
            "orders": f"{base_url}/api/v1/orders",
            "health": f"{base_url}/api/v1/health/healthz",
        },
        "ucp": {
            "version": UCP_PROTOCOL_VERSION,
            "services": {
                "dev.ucp.shopping": [
                    {
                        "version": UCP_PROTOCOL_VERSION,
                        "spec": UCP_SPEC_URL,
                        "transport": "rest",
                        "endpoint": f"{base_url}/api/v1/checkout",
                        "schema": UCP_REST_SCHEMA_URL,
                    }
                ]
            },
            "capabilities": {
                "dev.ucp.shopping.checkout": [
                    {
                        "version": UCP_PROTOCOL_VERSION,
                        "spec": UCP_CHECKOUT_SPEC_URL,
                        "schema": UCP_CHECKOUT_SCHEMA_URL,
                    }
                ]
            },
            "payment_handlers": {
                "com.asaas.pix": [
                    {
                        "id": "asaas_pix",
                        "version": UCP_PROTOCOL_VERSION,
                        "spec": UCP_SPEC_URL,
                        "schema": UCP_CHECKOUT_SCHEMA_URL,
                        "available_instruments": [
                            {"type": "pix", "currency": "BRL"}
                        ],
                    }
                ]
            },
        },
    }

    response = JsonResponse(data, json_dumps_params={"indent": 2})
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    response["Cache-Control"] = "public, max-age=3600"
    return response
