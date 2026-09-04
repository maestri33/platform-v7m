"""
A2A Agent Card Discovery — Open standard for Agent-to-Agent communication.

Implements:
- A2A Protocol Specification: /.well-known/agent-card.json
- Agent Discovery schema (v1.0)
- Linux Foundation / Agentic AI Foundation standard
"""

from __future__ import annotations

from typing import Any
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET


def _get_base_url(request: HttpRequest) -> str:
    """Resolve the canonical base URL from request or forwarded headers."""
    return request.build_absolute_uri("/").rstrip("/")


def get_agent_card_data(base_url: str) -> dict[str, Any]:
    """
    Build the A2A Agent Card schema dictionary for the V7M autonomous agent.
    """
    return {
        "$schema": "https://a2a-protocol.org/latest/schemas/agent-card.json",
        "name": "V7M Educational & Commercial Autonomous Agent",
        "description": (
            "Autonomous AI agent for the V7M Educational Ecosystem (Maestri Group), "
            "supporting student enrollment, promoter network operations, academic certification "
            "verification, and educational guidance via the A2A protocol."
        ),
        "version": "1.0.0",
        "provider": {
            "organization": "Maestri Group",
            "url": "https://maestri.group",
        },
        "documentationUrl": "https://maestri.group/docs",
        "supportedInterfaces": [
            {
                "url": f"{base_url}/api/v1",
                "protocolBinding": "HTTP+JSON",
                "protocolVersion": "1.0",
            },
            {
                "url": f"{base_url}/api/v1",
                "protocolBinding": "JSONRPC",
                "protocolVersion": "1.0",
            },
        ],
        "capabilities": {
            "streaming": False,
            "pushNotifications": False,
            "extendedAgentCard": False,
        },
        "defaultInputModes": [
            "text/plain",
            "application/json",
        ],
        "defaultOutputModes": [
            "application/json",
        ],
        "skills": [
            {
                "id": "student-onboarding",
                "name": "Student Onboarding & Enrollment",
                "description": (
                    "Guides prospective students through high school equivalency (EJA) "
                    "enrollment, eligibility verification, document intake, and automated checkout."
                ),
                "tags": [
                    "education",
                    "enrollment",
                    "eja",
                    "onboarding",
                    "documents",
                ],
                "examples": [
                    "Start enrollment for student CPF 123.456.789-00",
                    "Check eligibility for EJA certification",
                ],
                "inputModes": [
                    "text/plain",
                    "application/json",
                ],
                "outputModes": [
                    "application/json",
                ],
            },
            {
                "id": "promoter-network-operations",
                "name": "Promoter Network Operations",
                "description": (
                    "Manages promoter commissions, lead conversion funnels, affiliate links, "
                    "and automated WhatsApp/PIX lifecycle triggers."
                ),
                "tags": [
                    "promoter",
                    "affiliate",
                    "commissions",
                    "funnel",
                    "conversion",
                ],
                "examples": [
                    "Query commission tier and active leads for promoter",
                    "Generate short checkout link for student prospect",
                ],
                "inputModes": [
                    "application/json",
                ],
                "outputModes": [
                    "application/json",
                ],
            },
            {
                "id": "academic-certification-lookup",
                "name": "Academic Certification Verification",
                "description": (
                    "Queries accredited state educational publication status, Diário Oficial "
                    "registration numbers, and diploma authenticity."
                ),
                "tags": [
                    "certification",
                    "diario-oficial",
                    "diploma",
                    "mec",
                    "verification",
                ],
                "examples": [
                    "Verify certificate registration number",
                    "Check publication status in official gazette",
                ],
                "inputModes": [
                    "application/json",
                    "text/plain",
                ],
                "outputModes": [
                    "application/json",
                ],
            },
        ],
    }


@require_GET
def a2a_agent_card_view(request: HttpRequest) -> JsonResponse:
    """
    Serve /.well-known/agent-card.json per the A2A Protocol Specification.
    """
    base_url = _get_base_url(request)
    data = get_agent_card_data(base_url)

    response = JsonResponse(data, json_dumps_params={"indent": 2})
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response["Cache-Control"] = "public, max-age=3600"
    return response
