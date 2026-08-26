"""Testes unitários para o cliente administrativo do Stalwart Mail Server (mail/stalwart.py)."""

from __future__ import annotations

import httpx
import pytest
from django.test import override_settings

from mail.stalwart import StalwartClient, StalwartError, StalwartNotConfigured, generate_password


def _mock_client(handler, base_url="http://stalwart.test", user="admin@test", password="pwd") -> StalwartClient:
    c = StalwartClient(base_url=base_url, user=user, password=password)
    c._client = httpx.Client(
        base_url=base_url,
        auth=(user, password),
        transport=httpx.MockTransport(handler),
    )
    return c


def test_stalwart_not_configured_raises():
    with override_settings(STALWART_BASE_URL="", MAILCOW_BASE_URL="", STALWART_ADMIN_USER=""):
        with pytest.raises(StalwartNotConfigured):
            StalwartClient(base_url="", user="")


def test_generate_password_length_and_chars():
    pwd = generate_password(24)
    assert len(pwd) == 24
    assert any(c.isupper() for c in pwd)
    assert any(c.islower() for c in pwd)
    assert any(c.isdigit() for c in pwd)


def test_get_session_success():
    def handler(request: httpx.Request):
        assert request.url.path == "/jmap/session"
        return httpx.Response(200, json={"username": "admin@test", "accounts": {"b": {}}})

    with _mock_client(handler) as c:
        sess = c.get_session()
        assert sess["username"] == "admin@test"


def test_get_session_unauthorized():
    def handler(request: httpx.Request):
        return httpx.Response(401, json={"type": "unauthorized"})

    with _mock_client(handler) as c:
        with pytest.raises(StalwartError) as exc:
            c.get_session()
        assert exc.value.type == "unauthorized"


def test_list_domains_parsing():
    def handler(request: httpx.Request):
        payload = {
            "methodResponses": [
                ["x:Domain/query", {"ids": ["b", "c"]}],
                [
                    "x:Domain/get",
                    {
                        "list": [
                            {"id": "b", "name": "v7m.org"},
                            {"id": "c", "name": "maestri.group"},
                        ]
                    },
                ],
            ]
        }
        return httpx.Response(200, json=payload)

    with _mock_client(handler) as c:
        domains = c.list_domains()
        assert domains == ["v7m.org", "maestri.group"]


def test_get_domain_map():
    def handler(request: httpx.Request):
        payload = {
            "methodResponses": [
                [
                    "x:Domain/get",
                    {
                        "list": [
                            {"id": "dom_1", "name": "v7m.org"},
                            {"id": "dom_2", "domainName": "ieadpg.org"},
                        ]
                    },
                ],
            ]
        }
        return httpx.Response(200, json=payload)

    with _mock_client(handler) as c:
        d_map = c.get_domain_map()
        assert d_map == {"v7m.org": "dom_1", "ieadpg.org": "dom_2"}


def test_ensure_mailbox_creates_when_not_exists():
    calls = []

    def handler(request: httpx.Request):
        import json
        body = json.loads(request.content.decode())
        method_names = [m[0] for m in body.get("methodCalls", [])]
        calls.append(method_names)

        # 1. list domain
        if "x:Domain/query" in method_names:
            return httpx.Response(200, json={
                "methodResponses": [
                    ["x:Domain/get", {"list": [{"id": "d_v7m", "name": "v7m.org"}]}]
                ]
            })
        # 2. get account (not found)
        if "x:Account/query" in method_names:
            return httpx.Response(200, json={
                "methodResponses": [
                    ["x:Account/get", {"list": []}]
                ]
            })
        # 3. create account
        if "x:Account/set" in method_names:
            return httpx.Response(200, json={
                "methodResponses": [
                    ["x:Account/set", {"created": {"new_acc": {"id": "acc_123", "name": "app"}}}]
                ]
            })
        return httpx.Response(200, json={})

    with _mock_client(handler) as c:
        acc, pwd, created = c.ensure_mailbox(local_part="app", domain="v7m.org", name="App Service")

    assert created is True
    assert pwd is not None and len(pwd) >= 20
    assert acc["id"] == "acc_123"


def test_ensure_mailbox_reuses_existing_without_rotation():
    def handler(request: httpx.Request):
        import json
        body = json.loads(request.content.decode())
        method_names = [m[0] for m in body.get("methodCalls", [])]

        if "x:Domain/query" in method_names:
            return httpx.Response(200, json={
                "methodResponses": [
                    ["x:Domain/get", {"list": [{"id": "d_v7m", "name": "v7m.org"}]}]
                ]
            })
        if "x:Account/query" in method_names:
            return httpx.Response(200, json={
                "methodResponses": [
                    ["x:Account/get", {"list": [{"id": "acc_existing", "name": "app", "domainId": "d_v7m", "emailAddress": "app@v7m.org"}]}]
                ]
            })
        return httpx.Response(200, json={})

    with _mock_client(handler) as c:
        acc, pwd, created = c.ensure_mailbox(local_part="app", domain="v7m.org")

    assert created is False
    assert pwd is None
    assert acc["id"] == "acc_existing"


def test_ensure_mailbox_rotates_password_when_requested():
    def handler(request: httpx.Request):
        import json
        body = json.loads(request.content.decode())
        method_names = [m[0] for m in body.get("methodCalls", [])]

        if "x:Domain/query" in method_names:
            return httpx.Response(200, json={
                "methodResponses": [
                    ["x:Domain/get", {"list": [{"id": "d_v7m", "name": "v7m.org"}]}]
                ]
            })
        if "x:Account/query" in method_names:
            return httpx.Response(200, json={
                "methodResponses": [
                    ["x:Account/get", {"list": [{"id": "acc_existing", "name": "app", "domainId": "d_v7m", "emailAddress": "app@v7m.org"}]}]
                ]
            })
        if "x:Account/set" in method_names:
            return httpx.Response(200, json={
                "methodResponses": [
                    ["x:Account/set", {"updated": {"acc_existing": {}}}]
                ]
            })
        return httpx.Response(200, json={})

    with _mock_client(handler) as c:
        acc, pwd, created = c.ensure_mailbox(local_part="app", domain="v7m.org", rotate_password=True)

    assert created is False
    assert pwd is not None and len(pwd) >= 20
    assert acc["id"] == "acc_existing"


def test_ensure_mailbox_creation_failure_raises():
    def handler(request: httpx.Request):
        import json
        body = json.loads(request.content.decode())
        method_names = [m[0] for m in body.get("methodCalls", [])]

        if "x:Domain/query" in method_names:
            return httpx.Response(200, json={"methodResponses": [["x:Domain/get", {"list": []}]]})
        if "x:Account/query" in method_names:
            return httpx.Response(200, json={"methodResponses": [["x:Account/get", {"list": []}]]})
        if "x:Account/set" in method_names:
            return httpx.Response(200, json={
                "methodResponses": [
                    ["x:Account/set", {"notCreated": {"new_acc": {"description": "Quota exceeded"}}}]
                ]
            })
        return httpx.Response(200, json={})

    with _mock_client(handler) as c:
        with pytest.raises(StalwartError) as exc:
            c.ensure_mailbox(local_part="app", domain="v7m.org")
        assert "Quota exceeded" in str(exc.value)


def test_list_mailboxes_filtering():
    def handler(request: httpx.Request):
        return httpx.Response(200, json={
            "methodResponses": [
                ["x:Account/get", {
                    "list": [
                        {"id": "1", "name": "no-reply", "domainId": "v7m.org", "emailAddress": "no-reply@v7m.org", "description": "Sistema"},
                        {"id": "2", "name": "contato", "domainId": "v7m.org", "emailAddress": "contato@v7m.org", "description": "Atendimento"},
                        {"id": "3", "name": "admin", "domainId": "outro.com", "emailAddress": "admin@outro.com", "description": "Admin Outro"},
                    ]
                }]
            ]
        })

    with _mock_client(handler) as c:
        # Filtrado por v7m.org
        mboxes_v7m = c.list_mailboxes(domain="v7m.org")
        assert len(mboxes_v7m) == 2
        assert mboxes_v7m[0]["username"] == "no-reply@v7m.org"
        assert mboxes_v7m[1]["username"] == "contato@v7m.org"

        # Sem filtro
        mboxes_all = c.list_mailboxes()
        assert len(mboxes_all) == 3

