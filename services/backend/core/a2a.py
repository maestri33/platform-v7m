"""
A2A Agent Card Discovery with AP2 (Agent Payments Protocol) Extension.

Implements:
- A2A Protocol Specification: /.well-known/agent-card.json and /.well-known/agent.json
- Agent Payments Protocol (AP2) extension per https://ap2-protocol.org/
- Google Agentic Commerce / Linux Foundation Agentic AI Foundation standard
"""

from __future__ import annotations

from typing import Any
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET


def _get_base_url(request: HttpRequest) -> str:
    """Resolve the canonical base URL from request or forwarded headers."""
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")
    if forwarded_proto and forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}".rstrip("/")
    return request.build_absolute_uri("/").rstrip("/")


def get_agent_card_data(base_url: str) -> dict[str, Any]:
    """
    Build the A2A Agent Card schema dictionary including AP2 extension.
    """
    return {
        "$schema": "https://a2a-protocol.org/latest/schemas/agent-card.json",
        "name": "V7M Educational & Commercial Autonomous Agent",
        "description": (
            "Autonomous AI agent for the V7M Educational Ecosystem (Maestri Group), "
            "supporting student enrollment, promoter network operations, academic certification "
            "verification, and AP2 cryptographically-signed mandate payments."
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
            "extensions": [
                {
                    "uri": "https://github.com/google-agentic-commerce/AP2/tree/v0.1.0",
                    "description": "Agent Payments Protocol (AP2) extension for secure transactions via cryptographically-signed mandates",
                    "required": True,
                    "params": {
                        "roles": ["merchant"]
                    },
                }
            ],
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
                "id": "agentic-commerce-checkout",
                "name": "Agentic Commerce Checkout (AP2)",
                "description": "Executes cryptographic mandate verification, payment initiation, and student enrollment settlement via Agent Payments Protocol (AP2).",
                "tags": [
                    "commerce",
                    "ap2",
                    "payments",
                    "checkout",
                    "mandates",
                    "pix",
                ],
                "examples": [
                    "Process AP2 signed mandate for course enrollment",
                    "Verify merchant mandate and execute PIX payment",
                ],
                "inputModes": [
                    "application/json",
                ],
                "outputModes": [
                    "application/json",
                ],
            },
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
    Serve /.well-known/agent-card.json and /.well-known/agent.json with HTTP 200.
    """
    base_url = _get_base_url(request)
    data = get_agent_card_data(base_url)

    response = JsonResponse(data, json_dumps_params={"indent": 2})
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    response["Cache-Control"] = "public, max-age=3600"
    return response
