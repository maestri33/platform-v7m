"""
Universal Commerce Protocol (UCP) Discovery Endpoint.

Implements:
- /.well-known/ucp per UCP Specification (https://ucp.dev/specification/overview/)
Allows AI agents to discover content payment protocols, services, and capabilities.
"""

from __future__ import annotations

from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET


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
        "protocol_version": "1.0.0",
        "name": "V7M Platform Universal Commerce",
        "description": "Universal Commerce Protocol (UCP) endpoint for V7M educational enrollments, course checkout, and promoter payments.",
        "spec_url": "https://ucp.dev/specification/overview/",
        "services": [
            {
                "name": "checkout",
                "version": "1.0.0",
                "endpoint": f"{base_url}/api/v1/checkout",
                "spec_url": "https://ucp.dev/specification/overview/",
            },
            {
                "name": "orders",
                "version": "1.0.0",
                "endpoint": f"{base_url}/api/v1/orders",
                "spec_url": "https://ucp.dev/specification/overview/",
            },
        ],
        "capabilities": {
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
    }

    response = JsonResponse(data, json_dumps_params={"indent": 2})
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    response["Cache-Control"] = "public, max-age=3600"
    return response
