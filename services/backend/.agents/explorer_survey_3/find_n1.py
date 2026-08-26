"""Find potential N+1 query patterns across the codebase."""
import os
import sys
import re
from pathlib import Path

sys.path.insert(0, os.path.abspath("."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

import django
django.setup()

n1_suspects = []

py_files = list(Path("api").glob("**/*.py")) + list(Path("users").glob("**/*.py")) + list(Path("hub").glob("**/*.py")) + list(Path("finance").glob("**/*.py")) + list(Path("notify").glob("**/*.py"))

for pf in py_files:
    content = pf.read_text(encoding="utf-8")
    lines = content.splitlines()
    
    # 1. Look for loop patterns calling queries
    in_loop = False
    loop_indent = 0
    
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        indent = len(line) - len(line.lstrip())
        
        if stripped.startswith("for ") and stripped.endswith(":"):
            in_loop = True
            loop_indent = indent
            continue
        
        if in_loop:
            if indent <= loop_indent and stripped != "":
                in_loop = False
            else:
                # Inside loop body
                if any(k in stripped for k in ["profiles.get(", ".objects.filter(", ".objects.get(", ".count()", ".first()", ".exists()"]):
                    n1_suspects.append({
                        "file": str(pf),
                        "line": i,
                        "content": stripped,
                        "type": "Query inside loop"
                    })

        # 2. Look for list comprehension calling queries
        if "[" in stripped and " for " in stripped and " in " in stripped:
            if any(k in stripped for k in ["profiles.get(", ".objects.filter(", ".objects.get(", ".count()"]):
                n1_suspects.append({
                    "file": str(pf),
                    "line": i,
                    "content": stripped,
                    "type": "Query in list comprehension"
                })

print(f"Total potential N+1 query locations found: {len(n1_suspects)}")
for s in n1_suspects:
    print(f"[{s['type']}] {s['file']}:{s['line']}")
    print(f"  > {s['content']}")
