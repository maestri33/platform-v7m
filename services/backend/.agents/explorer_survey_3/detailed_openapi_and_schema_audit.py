"""Detailed OpenAPI, Pydantic Schema, Router and Service audit script."""
import os
import sys
import json
from pathlib import Path

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
    "clients": (clients_api, "api/clients"),
    "collaborators": (collaborators_api, "api/collaborators"),
    "leadership": (leadership_api, "api/leadership"),
    "staff": (staff_api, "api/staff"),
    "tools": (tools_api, "api/tools"),
    "health": (health_api, "api/health"),
    "portal": (portal_api, "api/portal"),
}

results = {}

for name, (ninja_inst, folder) in apis.items():
    print(f"\n==========================================")
    print(f"API: {name}")
    print(f"==========================================")
    
    schema = ninja_inst.get_openapi_schema()
    paths = schema.get("paths", {})
    components = schema.get("components", {}).get("schemas", {})
    
    ops_detail = []
    for path_str, methods in paths.items():
        for method, op in methods.items():
            responses = op.get("responses", {})
            req_body = op.get("requestBody", {})
            params = op.get("parameters", [])
            ops_detail.append({
                "path": path_str,
                "method": method.upper(),
                "summary": op.get("summary"),
                "tags": op.get("tags"),
                "responses": responses,
                "parameters_count": len(params),
                "has_body": bool(req_body),
            })
            
    results[name] = {
        "title": ninja_inst.title,
        "version": ninja_inst.version,
        "total_paths": len(paths),
        "total_operations": len(ops_detail),
        "total_schemas": len(components),
        "operations": ops_detail,
        "schemas": list(components.keys()),
    }
    print(f"Paths: {len(paths)}, Ops: {len(ops_detail)}, Schemas: {len(components)}")

with open("c:/Users/maestri33/dev/v7m/backend-v7m/.agents/explorer_survey_3/openapi_detailed.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print("\nSaved openapi_detailed.json successfully!")
