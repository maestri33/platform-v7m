"""Auditoria e testes de integração avançados para o Stalwart Mail Server (services/notify)."""

from __future__ import annotations

import httpx
import pytest
from django.test import override_settings

from mail.stalwart import StalwartClient, StalwartError, generate_password


def _mock_stalwart_client(handler, base_url="http://10.0.1.20:8080", user="ceo@v7m.org", password="sec") -> StalwartClient:
    client = StalwartClient(base_url=base_url, user=user, password=password, timeout=5.0)
    client._client = httpx.Client(
        base_url=base_url,
        auth=(user, password),
        transport=httpx.MockTransport(handler),
    )
    return client


def test_stalwart_connection_timeout_handling():
    def handler(request: httpx.Request):
        raise httpx.ConnectTimeout("Timeout connecting to CT 120 (10.0.1.20:8080)")

    client = _mock_stalwart_client(handler)
    with pytest.raises(httpx.ConnectTimeout):
        client.get_session()


def test_stalwart_multi_domain_resolution():
    def handler(request: httpx.Request):
        return httpx.Response(
            200,
            json={
                "methodResponses": [
                    [
                        "x:Domain/get",
                        {
                            "list": [
                                {"id": "dom_v7m", "name": "v7m.org"},
                                {"id": "dom_maestri", "name": "maestri.group"},
                                {"id": "dom_supletivo", "name": "supletivo.net.br"},
                            ]
                        },
                    ]
                ]
            },
        )

    with _mock_stalwart_client(handler) as client:
        domain_map = client.get_domain_map()
        assert domain_map["v7m.org"] == "dom_v7m"
        assert domain_map["maestri.group"] == "dom_maestri"
        assert domain_map["supletivo.net.br"] == "dom_supletivo"


def test_stalwart_mailbox_full_lifecycle():
    accounts_db = {}

    def handler(request: httpx.Request):
        import json
        body = json.loads(request.content.decode())
        call = body.get("methodCalls", [[]])[0]
        method = call[0] if call else ""

        if method == "x:Domain/query":
            return httpx.Response(200, json={"methodResponses": [["x:Domain/get", {"list": [{"id": "d_1", "name": "v7m.org"}]}]]})

        if method == "x:Account/query":
            email = "financeiro@v7m.org"
            acc = accounts_db.get(email)
            return httpx.Response(200, json={"methodResponses": [["x:Account/get", {"list": [acc] if acc else []}]]})

        if method == "x:Account/set":
            args = call[1]
            if "create" in args:
                new_acc = args["create"]["new_acc"]
                acc_obj = {"id": "acc_fin_1", "name": new_acc["name"], "domainId": "d_1", "emailAddress": "financeiro@v7m.org"}
                accounts_db["financeiro@v7m.org"] = acc_obj
                return httpx.Response(200, json={"methodResponses": [["x:Account/set", {"created": {"new_acc": acc_obj}}]]})

        return httpx.Response(200, json={"methodResponses": []})

    with _mock_stalwart_client(handler) as client:
        # 1. Cria conta
        acc, pwd, created = client.ensure_mailbox(local_part="financeiro", domain="v7m.org", name="Financeiro V7M")
        assert created is True
        assert pwd is not None
        assert acc["id"] == "acc_fin_1"

        # 2. Reutiliza sem rotação
        acc2, pwd2, created2 = client.ensure_mailbox(local_part="financeiro", domain="v7m.org")
        assert created2 is False
        assert pwd2 is None
        assert acc2["id"] == "acc_fin_1"


def test_stalwart_password_entropy():
    passwords = {generate_password(32) for _ in range(50)}
    assert len(passwords) == 50  # 100% senhas únicas
    for p in passwords:
        assert len(p) == 32
        assert any(c.isdigit() for c in p)
        assert any(c.isupper() for c in p)
        assert any(c.islower() for c in p)
