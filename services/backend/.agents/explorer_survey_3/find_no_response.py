"""Find all endpoints without explicit `response=` decorator argument."""
import os
import sys
from pathlib import Path
import ast

sys.path.insert(0, os.path.abspath("."))

ROUTER_FILES = list(Path("api").glob("**/routers/*.py")) + list(Path("api").glob("**/router.py")) + [Path("api/portal.py")]

no_response_endpoints = []
for rf in ROUTER_FILES:
    content = rf.read_text(encoding="utf-8")
    tree = ast.parse(content, filename=str(rf))
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for deco in node.decorator_list:
                # check if decorator is router.get/post/put/delete/patch
                if isinstance(deco, ast.Call) and isinstance(deco.func, ast.Attribute):
                    if deco.func.attr in ["get", "post", "put", "patch", "delete", "api_operation"]:
                        # check if response kwarg exists
                        has_response = any(kw.arg == "response" for kw in deco.keywords)
                        if not has_response:
                            # get path and method
                            route_path = deco.args[0].value if deco.args and isinstance(deco.args[0], ast.Constant) else "?"
                            no_response_endpoints.append({
                                "file": str(rf),
                                "line": node.lineno,
                                "func": node.name,
                                "method": deco.func.attr.upper(),
                                "path": route_path,
                            })

print(f"Total endpoints without explicit response= in decorator: {len(no_response_endpoints)}")
for ep in no_response_endpoints:
    print(f"  * {ep['file']}:{ep['line']} [{ep['method']} {ep['path']}] def {ep['func']}")
