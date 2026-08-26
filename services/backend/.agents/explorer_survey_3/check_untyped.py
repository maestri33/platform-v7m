"""Analyze response model typing and explicit schemas across all endpoints."""
import os
import sys

sys.path.insert(0, os.path.abspath("."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

import django
django.setup()

from api.clients import api as clients_api
from api.collaborators import api as collaborators_api
from api.leadership import api as leadership_api
from api.staff import api as staff_api
from api.tools import api as tools_api
from api.health import health_api
from api.portal import portal_api

apis = {
    "clients": clients_api,
    "collaborators": collaborators_api,
    "leadership": leadership_api,
    "staff": staff_api,
    "tools": tools_api,
    "health": health_api,
    "portal": portal_api,
}

print("=" * 80)
print("CHECKING TYPED RESPONSE SCHEMAS ACROSS ALL ENDPOINTS")
print("=" * 80)

untyped_endpoints = []
for name, ninja_inst in apis.items():
    schema = ninja_inst.get_openapi_schema()
    for path, methods in schema.get("paths", {}).items():
        for method, op_info in methods.items():
            responses = op_info.get("responses", {})
            for code, resp in responses.items():
                content = resp.get("content", {})
                if not content:
                    # Could be 204 No Content
                    continue
                json_schema = content.get("application/json", {}).get("schema", {})
                # Check if it has a $ref or properties or is just empty/generic object
                has_ref = "$ref" in json_schema or ("items" in json_schema and "$ref" in json_schema.get("items", {}))
                is_any = json_schema == {} or json_schema.get("type") is None
                if is_any or (not has_ref and json_schema.get("type") == "object" and "properties" not in json_schema):
                    untyped_endpoints.append({
                        "api": name,
                        "method": method.upper(),
                        "path": path,
                        "summary": op_info.get("summary"),
                        "schema": json_schema
                    })

print(f"Total untyped/generic endpoints: {len(untyped_endpoints)}")
for ep in untyped_endpoints:
    print(f"  - [{ep['api']}] {ep['method']} {ep['path']} -> {ep['summary']} (schema: {ep['schema']})")
