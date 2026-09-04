"""
x402 Payment Protocol Discovery and Middleware Endpoints.

Implements:
- x402 Protocol Specification (https://x402.org)
- HTTP 402 Payment Required for machine-to-machine transactions
- /.well-known/x402.json and /.well-known/x402 discovery manifests
"""

from __future__ import annotations

import base64
import json
from typing import Any
from django.http import HttpRequest, JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods


X402_NETWORK = "eip155:8453"  # Base Mainnet
X402_PAY_TO = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
X402_ASSET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  # USDC on Base


def _get_base_url(request: HttpRequest) -> str:
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")
    if forwarded_proto and forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}".rstrip("/")
    return request.build_absolute_uri("/").rstrip("/")


def get_x402_manifest(resource_url: str) -> dict[str, Any]:
    return {
        "x402Version": 2,
        "accepts": [
            {
                "scheme": "exact",
                "network": X402_NETWORK,
                "amount": "1000",
                "resource": resource_url,
                "description": "V7M Educational & Commercial agent API, payable via x402 on Base (USDC).",
                "mimeType": "application/json",
                "payTo": X402_PAY_TO,
                "maxTimeoutSeconds": 300,
                "asset": X402_ASSET,
                "extra": {
                    "name": "USDC",
                    "version": "2",
                    "label": "API",
                },
            }
        ],
        "error": "Payment required to access this resource",
    }


def x402_discovery_view(request: HttpRequest) -> JsonResponse:
    base_url = _get_base_url(request)
    data = get_x402_manifest(f"{base_url}/api")
    response = JsonResponse(data, json_dumps_params={"indent": 2})
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    response["Cache-Control"] = "public, max-age=3600"
    return response


@require_http_methods(["GET", "POST", "OPTIONS"])
def x402_api_gateway_view(request: HttpRequest) -> HttpResponse:
    if request.method == "OPTIONS":
        res = HttpResponse(status=204)
        res["Access-Control-Allow-Origin"] = "*"
        res["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        res["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, Accept, X-Payment, Payment-Required"
        )
        res["Access-Control-Expose-Headers"] = (
            "Payment-Required, X-Payment-Required, Accept-Payment"
        )
        return res

    base_url = _get_base_url(request)
    resource = f"{base_url}{request.path}"
    data = get_x402_manifest(resource)

    body_bytes = json.dumps(data, indent=2).encode("utf-8")
    base64_payload = base64.b64encode(json.dumps(data).encode("utf-8")).decode("utf-8")

    res = HttpResponse(
        body_bytes, content_type="application/json; charset=utf-8", status=402
    )
    res["Access-Control-Allow-Origin"] = "*"
    res["Access-Control-Expose-Headers"] = (
        "Payment-Required, X-Payment-Required, Accept-Payment"
    )
    res["Accept-Payment"] = f"x402; network={X402_NETWORK}; asset=USDC"
    res["Payment-Required"] = base64_payload
    res["X-Payment-Required"] = f"x402; network={X402_NETWORK}; asset=USDC; amount=1000"
    return res
