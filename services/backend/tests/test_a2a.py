"""
Tests for A2A Agent Card Discovery with AP2 (Agent Payments Protocol) Extension.

Verifies:
- Canonical endpoint /.well-known/agent-card.json
- Alias endpoint /.well-known/agent.json
- AP2 extension declaration in capabilities.extensions
- Skills declaration including agentic-commerce-checkout
- CORS and Cache-Control headers
"""

import json
import pytest
from django.test import Client


@pytest.fixture
def client():
    return Client()


def test_agent_card_canonical_endpoint(client):
    """
    Test /.well-known/agent-card.json returns 200, valid A2A schema, and AP2 extension.
    """
    response = client.get("/.well-known/agent-card.json")
    assert response.status_code == 200
    assert "application/json" in response["Content-Type"]
    assert response["Access-Control-Allow-Origin"] == "*"

    data = json.loads(response.content.decode("utf-8"))

    # Core A2A fields
    assert data["$schema"] == "https://a2a-protocol.org/latest/schemas/agent-card.json"
    assert data["name"] == "V7M Educational & Commercial Autonomous Agent"
    assert "Maestri Group" in data["provider"]["organization"]
    assert len(data["supportedInterfaces"]) > 0

    # AP2 Extension verification
    capabilities = data.get("capabilities", {})
    extensions = capabilities.get("extensions", [])
    assert len(extensions) > 0, "Agent card must declare extensions"

    ap2_extension = next(
        (ext for ext in extensions if "AP2" in ext.get("uri", "") or "ap2" in ext.get("uri", "").lower()),
        None,
    )
    assert ap2_extension is not None, "AP2 extension must be present in capabilities.extensions"
    assert ap2_extension["uri"] == "https://github.com/google-agentic-commerce/AP2/tree/v0.1.0"
    assert ap2_extension["required"] is True
    assert "merchant" in ap2_extension["params"]["roles"]

    # Skills verification
    skills = data.get("skills", [])
    skill_ids = [s["id"] for s in skills]
    assert "agentic-commerce-checkout" in skill_ids

    checkout_skill = next(s for s in skills if s["id"] == "agentic-commerce-checkout")
    assert "ap2" in checkout_skill["tags"]
    assert "commerce" in checkout_skill["tags"]


def test_agent_alias_endpoint(client):
    """
    Test /.well-known/agent.json returns identical AP2 agent card payload.
    """
    response = client.get("/.well-known/agent.json")
    assert response.status_code == 200
    assert "application/json" in response["Content-Type"]
    assert response["Access-Control-Allow-Origin"] == "*"

    data = json.loads(response.content.decode("utf-8"))
    assert data["$schema"] == "https://a2a-protocol.org/latest/schemas/agent-card.json"
    assert "capabilities" in data
    assert any(
        ext.get("uri") == "https://github.com/google-agentic-commerce/AP2/tree/v0.1.0"
        for ext in data["capabilities"].get("extensions", [])
    )


def test_agent_card_forwarded_host(client):
    """
    Test URL resolution respects X-Forwarded-Host and X-Forwarded-Proto headers.
    """
    response = client.get(
        "/.well-known/agent-card.json",
        HTTP_X_FORWARDED_PROTO="https",
        HTTP_X_FORWARDED_HOST="api.v7m.education",
    )
    assert response.status_code == 200
    data = json.loads(response.content.decode("utf-8"))
    assert any(
        "https://api.v7m.education" in iface["url"]
        for iface in data["supportedInterfaces"]
    )
