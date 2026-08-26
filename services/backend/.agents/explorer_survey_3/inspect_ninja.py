"""Survey script for Django Ninja APIs, Routers, Schemas, and OpenAPI integrity."""
import os
import sys

sys.path.insert(0, os.path.abspath("."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

import django
django.setup()

import json
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
print("1. NINJA INSTANCES & OPENAPI GENERATION CHECK")
print("=" * 80)

total_operations = 0
for name, ninja_inst in apis.items():
    print(f"\n--- Checking API: {name} ({ninja_inst.title} v{ninja_inst.version}) ---")
    try:
        schema = ninja_inst.get_openapi_schema()
        paths = schema.get("paths", {})
        op_count = sum(len(methods) for path, methods in paths.items())
        total_operations += op_count
        print(f"  [OK] OpenAPI Schema generated successfully! Paths: {len(paths)}, Operations: {op_count}")
        
        # Check components/schemas
        components = schema.get("components", {}).get("schemas", {})
        print(f"  Schemas in OpenAPI components: {len(components)}")
    except Exception as e:
        print(f"  [ERROR] OpenAPI Schema generation failed for {name}: {e}")
        import traceback
        traceback.print_exc()

print(f"\nTotal operations across all APIs: {total_operations}")

print("\n" + "=" * 80)
print("2. MAPPING ALL OPERATIONS / ENDPOINTS")
print("=" * 80)

endpoints_data = []
for api_name, ninja_inst in apis.items():
    schema = ninja_inst.get_openapi_schema()
    for path, methods in schema.get("paths", {}).items():
        for method, op_info in methods.items():
            summary = op_info.get("summary", "")
            tags = op_info.get("tags", [])
            operation_id = op_info.get("operationId", "")
            responses = list(op_info.get("responses", {}).keys())
            has_summary = bool(summary)
            endpoints_data.append({
                "api": api_name,
                "method": method.upper(),
                "path": f"/api/v1/{api_name}{path}" if api_name != "portal" else f"/portal{path}",
                "summary": summary,
                "tags": tags,
                "responses": responses,
                "has_summary": has_summary,
            })

print(f"Total mapped endpoints: {len(endpoints_data)}")
missing_summary = [ep for ep in endpoints_data if not ep["has_summary"]]
print(f"Endpoints missing summary: {len(missing_summary)}")
if missing_summary:
    for ep in missing_summary:
        print(f"  - [{ep['api']}] {ep['method']} {ep['path']}")

# Save mapped endpoints to json
with open("c:/Users/maestri33/dev/v7m/backend-v7m/.agents/explorer_survey_3/mapped_endpoints.json", "w", encoding="utf-8") as f:
    json.dump(endpoints_data, f, indent=2, ensure_ascii=False)

print("\nSaved mapped_endpoints.json")
