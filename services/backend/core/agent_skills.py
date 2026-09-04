"""
Agent Skills Discovery (RFC v0.2.0)

Implements:
- /.well-known/agent-skills/index.json per Agent Skills Discovery RFC v0.2.0
- /.well-known/agent-skills/<skill_name>/SKILL.md
"""

from __future__ import annotations

import json
from pathlib import Path
from django.http import Http404, HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.http import require_GET

SCHEMA_URI = "https://schemas.agentskills.io/discovery/0.2.0/schema.json"

# Base directory for repository root
REPO_ROOT = Path(__file__).resolve().parents[3]
SKILLS_DIR = REPO_ROOT / "tooling" / "agent-skills"


@require_GET
def agent_skills_index_view(request: HttpRequest) -> JsonResponse:
    """
    Serve /.well-known/agent-skills/index.json per RFC v0.2.0.
    """
    # Prefer generated index in apps or compute from tooling/agent-skills
    index_file = (
        REPO_ROOT
        / "apps"
        / "landing-promotor"
        / "public"
        / ".well-known"
        / "agent-skills"
        / "index.json"
    )

    if index_file.exists():
        data = json.loads(index_file.read_text(encoding="utf-8"))
    else:
        # Fallback minimal compliant payload
        data = {
            "$schema": SCHEMA_URI,
            "skills": [],
        }

    response = JsonResponse(data, json_dumps_params={"indent": 2})
    response["Access-Control-Allow-Origin"] = "*"
    response["Cache-Control"] = "public, max-age=3600"
    return response


@require_GET
def agent_skill_artifact_view(request: HttpRequest, skill_name: str) -> HttpResponse:
    """
    Serve /.well-known/agent-skills/<skill_name>/SKILL.md.
    """
    skill_file = SKILLS_DIR / skill_name / "SKILL.md"
    if not skill_file.exists() or not skill_file.is_file():
        raise Http404("Skill artifact not found")

    content = skill_file.read_text(encoding="utf-8")
    response = HttpResponse(content, content_type="text/markdown; charset=utf-8")
    response["Access-Control-Allow-Origin"] = "*"
    response["Cache-Control"] = "public, max-age=3600"
    return response
