"""
Tests for A2A Agent Card with AP2 Extension.

Validates:
- HTTP 200 on /.well-known/agent-card.json and /.well-known/agent.json
- JSON structure conforms to A2A Agent Card specification
- AP2 extension is declared with correct URI, required=true, roles=["merchant"]
- CORS headers and caching are properly set
"""

import pytest
from django.test import Client, override_settings

AGENT_CARD_URL = "/.well-known/agent-card.json"
AGENT_ALIAS_URL = "/.well-known/agent.json"
AP2_EXTENSION_URI = "https://github.com/google-agentic-commerce/AP2/tree/v0.1.0"


@pytest.fixture
def client():
    return Client()


class TestAgentCardEndpoints:
    """Test that both agent card endpoints return HTTP 200."""

    @pytest.mark.django_db
    def test_agent_card_returns_200(self, client):
        response = client.get(AGENT_CARD_URL)
        assert response.status_code == 200

    @pytest.mark.django_db
    def test_agent_alias_returns_200(self, client):
        response = client.get(AGENT_ALIAS_URL)
        assert response.status_code == 200

    @pytest.mark.django_db
    def test_only_get_allowed(self, client):
        for method in [client.post, client.put, client.delete, client.patch]:
            response = method(AGENT_CARD_URL)
            assert response.status_code == 405


class TestAgentCardStructure:
    """Test that the A2A Agent Card JSON conforms to the specification."""

    @pytest.mark.django_db
    def test_required_top_level_fields(self, client):
        response = client.get(AGENT_CARD_URL)
        data = response.json()
        assert "name" in data
        assert "description" in data
        assert "version" in data
        assert "supportedInterfaces" in data
        assert "capabilities" in data
        assert "skills" in data

    @pytest.mark.django_db
    def test_name_is_string(self, client):
        data = client.get(AGENT_CARD_URL).json()
        assert isinstance(data["name"], str)
        assert len(data["name"]) > 0

    @pytest.mark.django_db
    def test_supported_interfaces_structure(self, client):
        data = client.get(AGENT_CARD_URL).json()
        interfaces = data["supportedInterfaces"]
        assert isinstance(interfaces, list)
        assert len(interfaces) >= 1
        iface = interfaces[0]
        assert "url" in iface
        assert "protocolBinding" in iface
        assert "protocolVersion" in iface

    @pytest.mark.django_db
    def test_skills_structure(self, client):
        data = client.get(AGENT_CARD_URL).json()
        skills = data["skills"]
        assert isinstance(skills, list)
        assert len(skills) >= 1
        for skill in skills:
            assert "id" in skill
            assert "name" in skill
            assert "description" in skill

    @pytest.mark.django_db
    def test_both_endpoints_return_identical_structure(self, client):
        card = client.get(AGENT_CARD_URL).json()
        alias = client.get(AGENT_ALIAS_URL).json()
        # Both should have the same structure (URLs may differ)
        assert card["name"] == alias["name"]
        assert card["version"] == alias["version"]
        assert len(card["skills"]) == len(alias["skills"])


class TestAP2Extension:
    """Test that the AP2 extension is correctly declared."""

    @pytest.mark.django_db
    def test_extensions_present_in_capabilities(self, client):
        data = client.get(AGENT_CARD_URL).json()
        caps = data["capabilities"]
        assert "extensions" in caps
        assert isinstance(caps["extensions"], list)
        assert len(caps["extensions"]) >= 1

    @pytest.mark.django_db
    def test_ap2_extension_uri(self, client):
        data = client.get(AGENT_CARD_URL).json()
        extensions = data["capabilities"]["extensions"]
        ap2_ext = next((e for e in extensions if e["uri"] == AP2_EXTENSION_URI), None)
        assert ap2_ext is not None, f"AP2 extension with URI {AP2_EXTENSION_URI} not found"

    @pytest.mark.django_db
    def test_ap2_extension_required_true(self, client):
        data = client.get(AGENT_CARD_URL).json()
        extensions = data["capabilities"]["extensions"]
        ap2_ext = next(e for e in extensions if e["uri"] == AP2_EXTENSION_URI)
        assert ap2_ext["required"] is True

    @pytest.mark.django_db
    def test_ap2_extension_merchant_role(self, client):
        data = client.get(AGENT_CARD_URL).json()
        extensions = data["capabilities"]["extensions"]
        ap2_ext = next(e for e in extensions if e["uri"] == AP2_EXTENSION_URI)
        assert "params" in ap2_ext
        assert "roles" in ap2_ext["params"]
        assert "merchant" in ap2_ext["params"]["roles"]

    @pytest.mark.django_db
    def test_ap2_extension_has_description(self, client):
        data = client.get(AGENT_CARD_URL).json()
        extensions = data["capabilities"]["extensions"]
        ap2_ext = next(e for e in extensions if e["uri"] == AP2_EXTENSION_URI)
        assert "description" in ap2_ext
        assert len(ap2_ext["description"]) > 0


class TestCorsAndHeaders:
    """Test CORS and caching headers."""

    @pytest.mark.django_db
    def test_cors_allow_origin(self, client):
        response = client.get(AGENT_CARD_URL)
        assert response["Access-Control-Allow-Origin"] == "*"

    @pytest.mark.django_db
    def test_cache_control(self, client):
        response = client.get(AGENT_CARD_URL)
        assert "public" in response["Cache-Control"]
        assert "max-age=3600" in response["Cache-Control"]

    @pytest.mark.django_db
    def test_content_type_json(self, client):
        response = client.get(AGENT_CARD_URL)
        assert "application/json" in response["Content-Type"]

    @pytest.mark.django_db
    def test_alias_has_same_headers(self, client):
        response = client.get(AGENT_ALIAS_URL)
        assert response["Access-Control-Allow-Origin"] == "*"
        assert "public" in response["Cache-Control"]
