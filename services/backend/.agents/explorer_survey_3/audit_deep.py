"""Deep audit script for schemas, routers, services, ORM patterns, and exceptions."""
import os
import sys
import inspect
import importlib
import pkgutil

sys.path.insert(0, os.path.abspath("."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

import django
django.setup()

import pydantic
from ninja import Schema, FilterSchema, ModelSchema
from ninja.pagination import PaginationBase
from django.db import models

print("Pydantic version:", pydantic.__version__)
print("Django version:", django.__version__)

# ---------------------------------------------------------
# 1. Audit Schemas
# ---------------------------------------------------------
print("\n" + "=" * 80)
print("1. PYDANTIC / NINJA SCHEMAS AUDIT")
print("=" * 80)

import api.schemas
import api.clients.schemas
import api.collaborators.schemas
import api.leadership.schemas
import api.staff.schemas
import api.tools.schemas

schema_modules = [
    api.schemas,
    api.schemas.address,
    api.schemas.auth,
    api.schemas.documents,
    api.schemas.student,
    api.schemas.training,
    api.clients.schemas,
    api.collaborators.schemas,
    api.leadership.schemas,
    api.staff.schemas,
    api.tools.schemas,
]

all_schemas = []
for mod in schema_modules:
    for attr_name in dir(mod):
        attr = getattr(mod, attr_name)
        if isinstance(attr, type) and issubclass(attr, Schema) and attr is not Schema and attr is not FilterSchema and attr is not ModelSchema:
            if attr not in all_schemas:
                all_schemas.append(attr)

print(f"Total Schema classes found in api.*: {len(all_schemas)}")

schemas_summary = []
v1_config_count = 0
v2_config_count = 0
from_attr_count = 0
no_config_count = 0

for s in all_schemas:
    mod_name = s.__module__
    name = s.__name__
    # Check config
    has_v1_config = hasattr(s, "Config") and inspect.isclass(getattr(s, "Config"))
    model_config = getattr(s, "model_config", None)
    has_from_attributes = False
    if model_config and isinstance(model_config, dict):
        has_from_attributes = model_config.get("from_attributes", False)
    elif has_v1_config:
        has_from_attributes = getattr(s.Config, "from_attributes", getattr(s.Config, "orm_mode", False))

    if has_v1_config:
        v1_config_count += 1
    elif model_config:
        v2_config_count += 1
    else:
        no_config_count += 1

    if has_from_attributes:
        from_attr_count += 1

    schemas_summary.append({
        "module": mod_name,
        "name": name,
        "is_filter": issubclass(s, FilterSchema),
        "is_model_schema": issubclass(s, ModelSchema),
        "has_v1_config": has_v1_config,
        "has_v2_model_config": bool(model_config),
        "from_attributes": has_from_attributes,
        "fields": list(s.model_fields.keys()) if hasattr(s, "model_fields") else list(s.__fields__.keys())
    })

print(f"  - Schemas using v1 class Config: {v1_config_count}")
print(f"  - Schemas using v2 model_config: {v2_config_count}")
print(f"  - Schemas with from_attributes (ORM mode): {from_attr_count}")
print(f"  - Schemas without explicit config: {no_config_count}")

# Check FilterSchema usage
filter_schemas = [s for s in all_schemas if issubclass(s, FilterSchema)]
print(f"  - FilterSchema classes found: {len(filter_schemas)}")
for fs in filter_schemas:
    print(f"    * {fs.__module__}.{fs.__name__}")

# Check Out vs In vs PatchIn naming conventions
in_schemas = [s for s in all_schemas if s.__name__.endswith("In") or "Create" in s.__name__ or "Update" in s.__name__]
out_schemas = [s for s in all_schemas if s.__name__.endswith("Out") or "Response" in s.__name__]
patch_schemas = [s for s in all_schemas if "Patch" in s.__name__ or "Update" in s.__name__]
other_schemas = [s for s in all_schemas if s not in in_schemas and s not in out_schemas and s not in filter_schemas]

print(f"\nNaming distribution:")
print(f"  - Input schemas (*In, Create*, Update*): {len(in_schemas)}")
print(f"  - Output schemas (*Out, Response*): {len(out_schemas)}")
print(f"  - Patch schemas (Patch*, Update*): {len(patch_schemas)}")
print(f"  - Other schemas: {len(other_schemas)}")
if other_schemas:
    print(f"    Examples: {[s.__name__ for s in other_schemas[:10]]}")

# ---------------------------------------------------------
# 2. Audit Endpoints & Status Codes
# ---------------------------------------------------------
print("\n" + "=" * 80)
print("2. ENDPOINTS & RESPONSE STATUS CODES AUDIT")
print("=" * 80)

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

endpoint_stats = {
    "total": 0,
    "explicit_dict_responses": 0,
    "single_type_responses": 0,
    "status_200_count": 0,
    "status_201_count": 0,
    "status_204_count": 0,
    "status_400_count": 0,
    "status_404_count": 0,
    "status_422_count": 0,
    "status_codes_used": {},
    "post_endpoints_without_201": [],
    "delete_endpoints_without_204": [],
}

for api_name, ninja_inst in apis.items():
    schema = ninja_inst.get_openapi_schema()
    for path, methods in schema.get("paths", {}).items():
        for method, op_info in methods.items():
            endpoint_stats["total"] += 1
            responses = op_info.get("responses", {})
            for code in responses.keys():
                endpoint_stats["status_codes_used"][code] = endpoint_stats["status_codes_used"].get(code, 0) + 1
            
            # Check REST status code conventions
            if method.lower() == "post":
                if "201" not in responses and "200" in responses:
                    endpoint_stats["post_endpoints_without_201"].append(f"[{api_name}] POST {path} (responses: {list(responses.keys())})")
            if method.lower() == "delete":
                if "204" not in responses:
                    endpoint_stats["delete_endpoints_without_204"].append(f"[{api_name}] DELETE {path} (responses: {list(responses.keys())})")

print(f"Status codes distribution in OpenAPI definitions:")
for code, count in sorted(endpoint_stats["status_codes_used"].items()):
    print(f"  - HTTP {code}: {count} occurrences")

print(f"\nPOST endpoints using 200 instead of 201: {len(endpoint_stats['post_endpoints_without_201'])}")
for ep in endpoint_stats["post_endpoints_without_201"][:10]:
    print(f"  * {ep}")

print(f"\nDELETE endpoints not using 204: {len(endpoint_stats['delete_endpoints_without_204'])}")
for ep in endpoint_stats["delete_endpoints_without_204"]:
    print(f"  * {ep}")

# ---------------------------------------------------------
# 3. Audit Exception Handling
# ---------------------------------------------------------
print("\n" + "=" * 80)
print("3. EXCEPTION HANDLING AUDIT")
print("=" * 80)

for api_name, ninja_inst in apis.items():
    handlers = getattr(ninja_inst, "_exception_handlers", {})
    print(f"API '{api_name}' registered exception handlers: {[h.__name__ if hasattr(h, '__name__') else str(h) for h in handlers.keys()]}")

# ---------------------------------------------------------
# 4. Audit Models & Relationships (for N+1 detection)
# ---------------------------------------------------------
print("\n" + "=" * 80)
print("4. MODELS & RELATIONSHIPS INVENTORY")
print("=" * 80)

from django.apps import apps
installed_models = apps.get_models()
print(f"Total Django models in project: {len(installed_models)}")

models_with_relations = []
for model in installed_models:
    app_label = model._meta.app_label
    if app_label in ["admin", "auth", "contenttypes", "sessions"]:
        continue
    fks = [f.name for f in model._meta.fields if isinstance(f, models.ForeignKey)]
    o2o = [f.name for f in model._meta.fields if isinstance(f, models.OneToOneField)]
    m2m = [f.name for f in model._meta.many_to_many]
    if fks or o2o or m2m:
        models_with_relations.append({
            "app": app_label,
            "model": model.__name__,
            "fks": fks,
            "o2o": o2o,
            "m2m": m2m,
        })
        print(f"  - {app_label}.{model.__name__}: FKs={fks}, O2O={o2o}, M2M={m2m}")

