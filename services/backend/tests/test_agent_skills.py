import json
import pytest
from django.test import RequestFactory
from core.agent_skills import agent_skills_index_view, agent_skill_artifact_view


@pytest.mark.django_db
class TestAgentSkillsDiscovery:
    def test_agent_skills_index_view(self):
        rf = RequestFactory()
        req = rf.get("/.well-known/agent-skills/index.json")
        res = agent_skills_index_view(req)
        assert res.status_code == 200
        assert res["Access-Control-Allow-Origin"] == "*"
        assert "public" in res["Cache-Control"]
        body = json.loads(res.content)
        assert "$schema" in body
        assert "skills" in body
