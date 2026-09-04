import json
import pytest
from django.test import RequestFactory
from core.ucp import ucp_discovery_view


@pytest.mark.django_db
class TestUcpDiscovery:
    def test_ucp_discovery_view_returns_200_and_json(self):
        rf = RequestFactory()
        req = rf.get("/.well-known/ucp")
        res = ucp_discovery_view(req)
        assert res.status_code == 200
        assert "application/json" in res["Content-Type"]
        assert res["Access-Control-Allow-Origin"] == "*"
        assert "public" in res["Cache-Control"]

        data = json.loads(res.content.decode("utf-8"))
        assert "protocol_version" in data
        assert "services" in data
        assert isinstance(data["services"], list)
        assert len(data["services"]) >= 1

        assert "capabilities" in data
        assert "endpoints" in data
