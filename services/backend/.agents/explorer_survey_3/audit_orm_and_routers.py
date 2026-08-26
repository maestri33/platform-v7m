"""Audit routers and services for layer separation and ORM N+1 query patterns."""
import os
import sys
import re

sys.path.insert(0, os.path.abspath("."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

import django
django.setup()

from pathlib import Path

ROUTER_DIRS = [
    Path("api/clients/routers"),
    Path("api/collaborators/routers"),
    Path("api/leadership/routers"),
    Path("api/staff/routers"),
    Path("api/tools"),
    Path("api/health"),
]

router_files = []
for rdir in ROUTER_DIRS:
    if rdir.is_file():
        router_files.append(rdir)
    elif rdir.is_dir():
        router_files.extend(list(rdir.glob("*.py")))

router_files.append(Path("api/portal.py"))

print(f"Total router files: {len(router_files)}")

# Look for direct ORM model queries vs service calls in routers
orm_in_routers = []
for rf in router_files:
    if rf.name == "__init__.py":
        continue
    content = rf.read_text(encoding="utf-8")
    lines = content.splitlines()
    
    # Check for direct .objects. calls
    direct_objects_calls = []
    select_related_calls = []
    prefetch_related_calls = []
    service_calls = []
    
    for i, line in enumerate(lines, 1):
        if ".objects." in line:
            direct_objects_calls.append((i, line.strip()))
        if "select_related" in line:
            select_related_calls.append((i, line.strip()))
        if "prefetch_related" in line:
            prefetch_related_calls.append((i, line.strip()))
        if "_service." in line or "service." in line or "interface." in line or "service(" in line:
            service_calls.append((i, line.strip()))

    orm_in_routers.append({
        "file": str(rf),
        "direct_objects_calls_count": len(direct_objects_calls),
        "direct_objects_calls": direct_objects_calls,
        "select_related_count": len(select_related_calls),
        "prefetch_related_count": len(prefetch_related_calls),
        "service_calls_count": len(service_calls),
    })

print("\n--- Router Query & Layer Separation Analysis ---")
for r in orm_in_routers:
    print(f"\n{r['file']}:")
    print(f"  Direct .objects calls: {r['direct_objects_calls_count']}")
    print(f"  select_related calls: {r['select_related_count']}")
    print(f"  prefetch_related calls: {r['prefetch_related_count']}")
    print(f"  service calls: {r['service_calls_count']}")
    if r["direct_objects_calls"]:
        for line_no, line_text in r["direct_objects_calls"][:5]:
            print(f"    L{line_no}: {line_text}")

# Check services in users, hub, finance, notify, integrations
SERVICE_FILES = list(Path(".").glob("**/service*.py")) + list(Path(".").glob("**/services.py")) + list(Path(".").glob("**/interface.py")) + list(Path(".").glob("**/services/*.py"))
# Filter out venv and agents
SERVICE_FILES = [f for f in SERVICE_FILES if ".venv" not in str(f) and ".agents" not in str(f)]

print(f"\n\nTotal Service/Interface files in domain: {len(SERVICE_FILES)}")
for sf in sorted(SERVICE_FILES):
    content = sf.read_text(encoding="utf-8")
    has_select = "select_related" in content
    has_prefetch = "prefetch_related" in content
    has_atomic = "transaction.atomic" in content
    has_objects = ".objects." in content
    print(f"  - {sf}: objects={has_objects}, select_related={has_select}, prefetch_related={has_prefetch}, atomic={has_atomic}")

