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
        assert data["protocol_version"] == "2026-08-25"
        assert "services" in data
        assert isinstance(data["services"], list)
        assert len(data["services"]) >= 1

        # Check spec and schema URLs
        for service in data["services"]:
            assert "spec_url" in service
            assert "schema" in service
            assert service["spec_url"].startswith("https://")
            assert service["schema"].startswith("https://")

        assert "capabilities" in data
        assert "endpoints" in data
        assert "checkout" in data["endpoints"]
        assert "orders" in data["endpoints"]
        assert "base_url" in data["endpoints"]
        assert "ucp" in data
        assert "version" in data["ucp"]
