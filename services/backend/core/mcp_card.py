"""
MCP Server Card Discovery (SEP-1649 & SEP-2127)

Implements:
- /.well-known/mcp/server-card.json per SEP-1649 & SEP-2127
- /.well-known/mcp.json per SEP-2127 canonical discovery path
- /.well-known/mcp/server-cards.json (plural format)
"""

from __future__ import annotations

import json
from pathlib import Path
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

REPO_ROOT = Path(__file__).resolve().parents[3]
PROMOTOR_CARD = (
    REPO_ROOT
    / "apps"
    / "landing-promotor"
    / "public"
    / ".well-known"
    / "mcp"
    / "server-card.json"
)

SCHEMA_URI = "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json"

FALLBACK_CARD = {
    "$schema": SCHEMA_URI,
    "serverInfo": {
        "name": "V7M Backend MCP Server",
        "version": "1.0.0",
    },
    "name": "v7m-backend/mcp",
    "version": "1.0.0",
    "description": (
        "Model Context Protocol (MCP) server for V7M Platform — notification dispatch, "
        "lead tracking, academic verification, and agent discovery."
    ),
    "websiteUrl": "https://maestri.group",
    "url": "https://api.maestri.group/mcp",
    "endpoint": "/mcp",
    "transport": {
        "type": "streamable-http",
        "endpoint": "/mcp",
    },
    "capabilities": {
        "tools": True,
        "resources": True,
        "prompts": False,
    },
    "tools": [
        {"name": "notify_send", "description": "Send a notification via WhatsApp and/or email."},
        {"name": "notify_send_event", "description": "Send notification using registered event template."},
        {"name": "notify_status", "description": "Check notification status, delivery state and errors."},
        {"name": "notify_history", "description": "Query notification delivery history."},
        {"name": "notify_inbox", "description": "Retrieve inbound messages received by the platform."},
        {"name": "notify_phone_check", "description": "Verify if phone numbers exist on WhatsApp."},
        {"name": "notify_channels", "description": "List configured delivery channels."},
        {"name": "notify_templates", "description": "List event notification templates."},
        {"name": "notify_template_upsert", "description": "Create or update event notification template."},
    ],
}


def _get_server_card_data() -> dict:
    if PROMOTOR_CARD.exists():
        try:
            return json.loads(PROMOTOR_CARD.read_text(encoding="utf-8"))
        except Exception:
            pass
    return FALLBACK_CARD


@require_GET
def mcp_server_card_view(request: HttpRequest) -> JsonResponse:
    """
    Serve /.well-known/mcp/server-card.json and /.well-known/mcp.json.
    """
    data = _get_server_card_data()
    response = JsonResponse(data, json_dumps_params={"indent": 2})
    response["Access-Control-Allow-Origin"] = "*"
    response["Cache-Control"] = "public, max-age=3600"
    return response


@require_GET
def mcp_server_cards_view(request: HttpRequest) -> JsonResponse:
    """
    Serve /.well-known/mcp/server-cards.json (array format per SEP-1649).
    """
    data = [_get_server_card_data()]
    response = JsonResponse(data, safe=False, json_dumps_params={"indent": 2})
    response["Access-Control-Allow-Origin"] = "*"
    response["Cache-Control"] = "public, max-age=3600"
    return response
