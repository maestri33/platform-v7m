"""
Tests for x402 Payment Protocol Discovery and Gateway Endpoints.

Verifies compliance with:
- x402 Protocol Specification (https://x402.org)
- Canonical discovery at /.well-known/x402.json and /.well-known/x402
- HTTP 402 Payment Required response with PAYMENT-REQUIRED header (v2)
- CORS and payment headers
"""

import base64
import json
import pytest
from django.test import Client


@pytest.fixture
def client():
    return Client()


def test_x402_discovery_json(client):
    """
    Test /.well-known/x402.json returns 200 and valid v2 manifest.
    """
    response = client.get("/.well-known/x402.json")
    assert response.status_code == 200
    assert "application/json" in response["Content-Type"]
    assert response["Access-Control-Allow-Origin"] == "*"

    data = json.loads(response.content.decode("utf-8"))
    assert data["x402Version"] == 2
    assert "accepts" in data
    assert len(data["accepts"]) > 0

    entry = data["accepts"][0]
    assert entry["scheme"] == "exact"
    assert entry["network"] == "eip155:8453"
    assert "payTo" in entry
    assert "asset" in entry


def test_x402_discovery_alias(client):
    """
    Test /.well-known/x402 alias endpoint.
    """
    response = client.get("/.well-known/x402")
    assert response.status_code == 200
    data = json.loads(response.content.decode("utf-8"))
    assert data["x402Version"] == 2


def test_x402_api_gateway_returns_402(client):
    """
    Test /api returns HTTP 402 with PAYMENT-REQUIRED header and body.
    """
    response = client.get("/api")
    assert response.status_code == 402
    assert "application/json" in response["Content-Type"]
    assert response["Access-Control-Allow-Origin"] == "*"

    # Required headers by x402 spec and isitagentready scanner
    assert "Payment-Required" in response
    assert "X-Payment-Required" in response
    assert "Accept-Payment" in response

    # Verify base64 decoded PAYMENT-REQUIRED header
    raw_b64 = response["Payment-Required"]
    decoded_json = json.loads(base64.b64decode(raw_b64).decode("utf-8"))
    assert decoded_json["x402Version"] == 2
    assert len(decoded_json["accepts"]) > 0

    # Body verification
    body = json.loads(response.content.decode("utf-8"))
    assert body["x402Version"] == 2
    assert "error" in body


def test_x402_api_gateway_options(client):
    """
    Test OPTIONS request for CORS preflight.
    """
    response = client.options("/api")
    assert response.status_code == 204
    assert response["Access-Control-Allow-Origin"] == "*"
    assert "Payment-Required" in response["Access-Control-Expose-Headers"]
