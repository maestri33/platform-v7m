"""Exports the unified OpenAPI 3 schema from Django Ninja to openapi.json."""
import os
import sys
import json
from pathlib import Path

# Locate services/backend relative to this script
script_dir = Path(__file__).resolve().parent
# script_dir is packages/api-client/scripts
# parents[0] = packages/api-client
# parents[1] = packages
# parents[2] = monorepo root (v7m)
backend_dir = script_dir.parents[2] / "services" / "backend"

if not backend_dir.exists():
    print(f"Error: backend directory not found at {backend_dir}")
    sys.exit(1)

sys.path.insert(0, str(backend_dir))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

try:
    import django
    django.setup()
except Exception as e:
    print(f"Error setting up Django: {e}")
    sys.exit(1)

from api.staff import api as staff_api
from api.health import health_api
from api.clients import api as clients_api
from api.collaborators import api as collaborators_api
from api.leadership import api as leadership_api
from api.tools import api as tools_api

apis = [
    ("/api/v1/staff", staff_api, "staff"),
    ("/api/v1/health", health_api, "health"),
    ("/api/v1/clients", clients_api, "clients"),
    ("/api/v1/collaborators", collaborators_api, "collaborators"),
    ("/api/v1/leadership", leadership_api, "leadership"),
    ("/api/v1/tools", tools_api, "tools"),
]

merged_paths = {}
merged_schemas = {}

for prefix, api_inst, group_name in apis:
    schema = api_inst.get_openapi_schema()
    for path, path_item in schema.get("paths", {}).items():
        full_path = path if path.startswith("/api/v1") else f"{prefix}{path}"
        # Make sure every operation has a unique operationId
        cleaned_path_item = {}
        for method, operation in path_item.items():
            if isinstance(operation, dict):
                op_copy = dict(operation)
                if "operationId" in op_copy:
                    op_copy["operationId"] = f"{group_name}_{op_copy['operationId']}"
                cleaned_path_item[method] = op_copy
            else:
                cleaned_path_item[method] = operation
        merged_paths[full_path] = cleaned_path_item
    merged_schemas.update(schema.get("components", {}).get("schemas", {}))

merged = {
    "openapi": "3.1.0",
    "info": {
        "title": "V7M API Specification",
        "version": "1.0.0",
        "description": "Unified Django Ninja OpenAPI schema for V7M Staff & Apps"
    },
    "paths": merged_paths,
    "components": {
        "schemas": merged_schemas
    }
}

output_path = script_dir / "openapi.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(merged, f, indent=2, ensure_ascii=False)

print(f"Successfully exported OpenAPI schema to {output_path} ({len(merged_paths)} paths, {len(merged_schemas)} schemas)")
