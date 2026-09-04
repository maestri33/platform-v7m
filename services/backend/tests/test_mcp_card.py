import json
import pytest
from django.test import RequestFactory
from core.mcp_card import (
    FALLBACK_CARD,
    _get_server_card_data,
    mcp_server_card_view,
    mcp_server_cards_view,
)


@pytest.mark.django_db
class TestMcpServerCard:
    def test_get_server_card_data_structure(self):
        data = _get_server_card_data()
        assert "serverInfo" in data or "name" in data
        assert "capabilities" in data
        assert data["capabilities"].get("tools") is True

    def test_mcp_server_card_view(self):
        rf = RequestFactory()
        req = rf.get("/.well-known/mcp/server-card.json")
        res = mcp_server_card_view(req)
        assert res.status_code == 200
        assert res["Access-Control-Allow-Origin"] == "*"
        assert "public" in res["Cache-Control"]
        body = json.loads(res.content)
        assert body["name"] or body.get("serverInfo", {}).get("name")

    def test_mcp_server_cards_view_plural(self):
        rf = RequestFactory()
        req = rf.get("/.well-known/mcp/server-cards.json")
        res = mcp_server_cards_view(req)
        assert res.status_code == 200
        assert res["Access-Control-Allow-Origin"] == "*"
        body = json.loads(res.content)
        assert isinstance(body, list)
        assert len(body) >= 1
