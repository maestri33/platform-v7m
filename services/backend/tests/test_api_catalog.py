import json
import pytest
from django.test import RequestFactory
from core.api_catalog import api_catalog_view


@pytest.mark.django_db
class TestApiCatalog:
    def test_api_catalog_view_returns_linkset(self):
        rf = RequestFactory()
        req = rf.get("/.well-known/api-catalog")
        res = api_catalog_view(req)
        assert res.status_code == 200
        assert "application/linkset+json" in res["Content-Type"]
        assert res["Access-Control-Allow-Origin"] == "*"
        assert "public" in res["Cache-Control"]

        data = json.loads(res.content.decode("utf-8"))
        assert "linkset" in data
        assert isinstance(data["linkset"], list)
        assert len(data["linkset"]) >= 1

        first_entry = data["linkset"][0]
        assert "anchor" in first_entry
        assert "service-desc" in first_entry
        assert "service-doc" in first_entry
