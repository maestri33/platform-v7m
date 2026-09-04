"""
A2A Agent Card with AP2 Extension (Agent Payments Protocol).

Implements:
- /.well-known/agent-card.json per A2A Protocol Specification
- /.well-known/agent.json (alias)

Declares the merchant role under the AP2 extension, enabling AI agents
to discover payment capabilities and transact via cryptographically-signed
mandates (https://ap2-protocol.org/).
"""

from __future__ import annotations

from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET


def _get_base_url(request: HttpRequest) -> str:
    """Resolve the canonical base URL from request or forwarded headers."""
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")
    if forwarded_proto and forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}".rstrip("/")
    return request.build_absolute_uri("/").rstrip("/")


def _build_agent_card(base_url: str) -> dict:
    """Build the A2A Agent Card payload with AP2 extension."""
    return {
        "name": "V7M Platform",
        "description": (
            "AI-ready merchant agent for V7M Platform — student enrollment, "
            "course discovery, promoter management, and academic verification "
            "for EJA distance-learning programs in Brazil."
        ),
        "version": "1.0.0",
        "supportedInterfaces": [
            {
                "url": f"{base_url}/a2a/v1",
                "protocolBinding": "HTTP+JSON",
                "protocolVersion": "0.3",
            }
        ],
        "capabilities": {
            "streaming": False,
            "pushNotifications": False,
            "extensions": [
                {
                    "uri": "https://github.com/google-agentic-commerce/AP2/tree/v0.1.0",
                    "description": (
                        "Agent Payments Protocol (AP2) — secure agent-led transactions "
                        "via cryptographically-signed mandates."
                    ),
                    "required": True,
                    "params": {
                        "roles": ["merchant"],
                    },
                }
            ],
        },
        "defaultInputModes": ["text/plain", "application/json"],
        "defaultOutputModes": ["text/plain", "application/json"],
        "skills": [
            {
                "id": "course-catalog",
                "name": "Course Catalog",
                "description": (
                    "Browse available EJA distance-learning courses, pricing, "
                    "and enrollment requirements."
                ),
                "tags": ["education", "catalog", "courses", "EJA"],
                "examples": [
                    "List available courses",
                    "Show pricing for Ensino Médio",
                ],
                "inputModes": ["text/plain"],
                "outputModes": ["application/json"],
            },
            {
                "id": "student-enrollment",
                "name": "Student Enrollment",
                "description": (
                    "Initiate student enrollment and checkout for EJA programs "
                    "with PIX or card payment."
                ),
                "tags": ["enrollment", "checkout", "payment", "PIX"],
                "examples": [
                    "Enroll a student in Ensino Médio",
                    "Start checkout for EJA course",
                ],
                "inputModes": ["application/json"],
                "outputModes": ["application/json"],
            },
            {
                "id": "academic-verification",
                "name": "Academic Verification",
                "description": (
                    "Check enrollment status, document verification, "
                    "and certificate availability."
                ),
                "tags": ["verification", "status", "certificate"],
                "examples": [
                    "Check enrollment status for CPF 123.456.789-00",
                ],
                "inputModes": ["text/plain"],
                "outputModes": ["application/json"],
            },
        ],
    }


@require_GET
def agent_card_view(request: HttpRequest) -> JsonResponse:
    """
    Serve /.well-known/agent-card.json and /.well-known/agent.json.

    Returns the A2A Agent Card with AP2 extension declaring the
    merchant role for agentic payments.
    """
    base_url = _get_base_url(request)
    data = _build_agent_card(base_url)

    response = JsonResponse(data, json_dumps_params={"indent": 2})
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    response["Cache-Control"] = "public, max-age=3600"
    return response
