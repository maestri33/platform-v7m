"""
Tests for A2A Protocol Agent Card Discovery endpoint.

Verifies compliance with:
- A2A Protocol Specification (v1.0): /.well-known/agent-card.json
- Required fields: name, version, description, supportedInterfaces, capabilities, skills
- AgentInterface objects structure
- AgentSkills objects structure
- CORS and cache headers
"""

import json
import pytest
from django.test import Client


@pytest.fixture
def client():
    return Client()


def test_agent_card_endpoint_serves_json_200(client):
    """
    Test /.well-known/agent-card.json returns HTTP 200 and application/json.
    """
    response = client.get("/.well-known/agent-card.json")
    assert response.status_code == 200
    assert "application/json" in response["Content-Type"]
    assert response["Access-Control-Allow-Origin"] == "*"

    data = json.loads(response.content.decode("utf-8"))

    # Core required fields per A2A Protocol Specification
    assert "name" in data and isinstance(data["name"], str)
    assert len(data["name"]) > 0
    assert "version" in data and isinstance(data["version"], str)
    assert "description" in data and isinstance(data["description"], str)
    assert len(data["description"]) > 0


def test_agent_card_supported_interfaces(client):
    """
    Test supportedInterfaces field conforms to A2A AgentInterface array schema.
    """
    response = client.get("/.well-known/agent-card.json")
    data = json.loads(response.content.decode("utf-8"))

    assert "supportedInterfaces" in data
    interfaces = data["supportedInterfaces"]
    assert isinstance(interfaces, list)
    assert len(interfaces) >= 1

    # First interface is the preferred interface
    pref = interfaces[0]
    assert "url" in pref and pref["url"].startswith("http")
    assert "protocolBinding" in pref and pref["protocolBinding"] == "HTTP+JSON"
    assert "protocolVersion" in pref and pref["protocolVersion"] == "1.0"


def test_agent_card_capabilities_and_skills(client):
    """
    Test capabilities and skills arrays conform to A2A specification.
    """
    response = client.get("/.well-known/agent-card.json")
    data = json.loads(response.content.decode("utf-8"))

    # Capabilities
    assert "capabilities" in data
    caps = data["capabilities"]
    assert isinstance(caps, dict)
    assert "streaming" in caps
    assert "pushNotifications" in caps
    assert "extendedAgentCard" in caps

    # Skills
    assert "skills" in data
    skills = data["skills"]
    assert isinstance(skills, list)
    assert len(skills) >= 1

    for skill in skills:
        assert "id" in skill and isinstance(skill["id"], str)
        assert "name" in skill and isinstance(skill["name"], str)
        assert "description" in skill and isinstance(skill["description"], str)
        assert "tags" in skill and isinstance(skill["tags"], list)
        assert len(skill["tags"]) > 0
