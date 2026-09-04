"""
RFC 9727 API Catalog Discovery.

Implements:
- /.well-known/api-catalog (Content-Type: application/linkset+json)
- /.well-known/api-catalog.json
"""

from __future__ import annotations

import json
from django.http import HttpRequest, HttpResponse
from django.views.decorators.http import require_GET

API_CATALOG_PAYLOAD = {
    "linkset": [
        {
            "anchor": "https://api.maestri.group/api",
            "service-doc": [
                {
                    "href": "https://api.maestri.group/api/docs",
                    "type": "text/html",
                }
            ],
            "service-desc": [
                {
                    "href": "https://api.maestri.group/api/openapi.json",
                    "type": "application/json",
                }
            ],
            "status": [
                {
                    "href": "https://api.maestri.group/api/v1/health/healthz",
                }
            ],
        },
        {
            "anchor": "https://maestri.group",
            "service-doc": [
                {
                    "href": "https://maestri.group/llms.txt",
                    "type": "text/plain",
                }
            ],
            "service-desc": [
                {
                    "href": "https://maestri.group/.well-known/mcp/server-card.json",
                    "type": "application/json",
                }
            ],
        },
    ]
}


@require_GET
def api_catalog_view(request: HttpRequest) -> HttpResponse:
    """
    Serve RFC 9727 API Catalog as application/linkset+json.
    """
    content = json.dumps(API_CATALOG_PAYLOAD, indent=2)
    response = HttpResponse(
        content=content,
        content_type="application/linkset+json; charset=utf-8",
        status=200,
    )
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    response["Cache-Control"] = "public, max-age=3600"
    return response
