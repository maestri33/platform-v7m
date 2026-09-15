"""
Tests for MPP Payment Discovery — /openapi.json with x-payment-info extensions.

Validates the OpenAPI 3.1.0 document served at the site root conforms to
draft-payment-discovery-00 and passes the isitagentready.com scanner logic.
"""

from __future__ import annotations

import json
import pytest
from django.test import Client


VALID_INTENTS = {"charge", "session"}
VALID_METHODS = {"tempo", "stripe", "lightning", "card"}


@pytest.mark.django_db
def test_openapi_json_returns_200_and_valid_json():
    """GET /openapi.json must return 200 with application/json."""
    client = Client()
    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert response["Content-Type"].startswith("application/json")

    data = json.loads(response.content.decode("utf-8"))
    assert data["openapi"] == "3.1.0"
    assert "info" in data
    assert "paths" in data


@pytest.mark.django_db
def test_openapi_json_cors_headers():
    """CORS headers must be present for cross-origin agent discovery."""
    client = Client()
    response = client.get("/openapi.json")

    assert response["Access-Control-Allow-Origin"] == "*"
    assert "GET" in response["Access-Control-Allow-Methods"]


@pytest.mark.django_db
def test_openapi_json_head_returns_200():
    """HEAD /openapi.json must return 200 (no body)."""
    client = Client()
    response = client.head("/openapi.json")

    assert response.status_code == 200
    assert response["Content-Type"].startswith("application/json")


@pytest.mark.django_db
def test_openapi_json_options_returns_204():
    """OPTIONS /openapi.json must return 204 with CORS headers."""
    client = Client()
    response = client.options("/openapi.json")

    assert response.status_code == 204
    assert response["Access-Control-Allow-Origin"] == "*"


@pytest.mark.django_db
def test_x_service_info_present_and_valid():
    """Top-level x-service-info must contain name and categories."""
    client = Client()
    response = client.get("/openapi.json")
    data = json.loads(response.content.decode("utf-8"))

    assert "x-service-info" in data
    info = data["x-service-info"]
    assert isinstance(info, dict)
    assert isinstance(info.get("name"), str)
    assert len(info["name"]) > 0
    assert isinstance(info.get("categories"), list)
    assert len(info["categories"]) > 0


@pytest.mark.django_db
def test_payable_operations_have_x_payment_info():
    """Every payable operation must have a valid x-payment-info extension."""
    client = Client()
    response = client.get("/openapi.json")
    data = json.loads(response.content.decode("utf-8"))

    paths = data.get("paths", {})
    assert len(paths) > 0, "Document must contain at least one path"

    found_payment_info = False

    for path_key, path_item in paths.items():
        for method, operation in path_item.items():
            if not isinstance(operation, dict):
                continue

            payment_info = operation.get("x-payment-info")
            if payment_info is None:
                continue

            found_payment_info = True

            # Required fields per draft-payment-discovery-00
            assert "intent" in payment_info, (
                f"{method.upper()} {path_key}: x-payment-info missing 'intent'"
            )
            assert payment_info["intent"] in VALID_INTENTS, (
                f"{method.upper()} {path_key}: invalid intent '{payment_info['intent']}'"
            )

            assert "method" in payment_info, (
                f"{method.upper()} {path_key}: x-payment-info missing 'method'"
            )
            assert payment_info["method"] in VALID_METHODS, (
                f"{method.upper()} {path_key}: invalid method '{payment_info['method']}'"
            )

            assert "amount" in payment_info, (
                f"{method.upper()} {path_key}: x-payment-info missing 'amount'"
            )
            # Amount must be a string that parses as a positive number
            amount = float(payment_info["amount"])
            assert amount > 0, (
                f"{method.upper()} {path_key}: amount must be positive"
            )

    assert found_payment_info, (
        "Document must contain at least one operation with x-payment-info"
    )


@pytest.mark.django_db
def test_scanner_mpp_pass_logic():
    """
    Simulate isitagentready.com scanner logic for MPP check.

    The scanner:
    1. Fetches GET /openapi.json
    2. Checks response is 200 with valid JSON
    3. Iterates paths looking for operations with x-payment-info
    4. Validates intent, method, and amount are present
    5. Returns status=pass if at least one valid x-payment-info found
    """
    client = Client()
    response = client.get("/openapi.json")

    # Step 1-2: Must return 200 with JSON
    assert response.status_code == 200
    assert "json" in response["Content-Type"]

    data = json.loads(response.content.decode("utf-8"))

    # Step 3-4: Find operations with valid x-payment-info
    valid_count = 0
    for path_key, path_item in data.get("paths", {}).items():
        for method, operation in path_item.items():
            if not isinstance(operation, dict):
                continue
            pi = operation.get("x-payment-info")
            if pi and pi.get("intent") and pi.get("method") and pi.get("amount"):
                valid_count += 1

    # Step 5: At least one valid operation → pass
    assert valid_count >= 1, (
        f"MPP scanner check would FAIL: found {valid_count} valid operations, need >= 1"
    )


@pytest.mark.django_db
def test_openapi_json_respects_forwarded_headers():
    """Server URL should adapt to forwarded headers."""
    client = Client()
    response = client.get(
        "/openapi.json",
        HTTP_X_FORWARDED_PROTO="https",
        HTTP_X_FORWARDED_HOST="api.maestri.group",
    )

    assert response.status_code == 200
    data = json.loads(response.content.decode("utf-8"))
    servers = data.get("servers", [])
    assert len(servers) > 0
    assert servers[0]["url"] == "https://api.maestri.group"
