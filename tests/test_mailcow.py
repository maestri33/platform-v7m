"""Cliente do mailcow.

O teste que mais importa é o primeiro: o mailcow devolve **HTTP 200 quando
falha**, com o erro no corpo. Se o cliente confiar no status code, o
provisionamento reporta sucesso e o app fica sem caixa de e-mail.
"""

from __future__ import annotations

import httpx
import pytest
from django.test import override_settings

from mail.mailcow import MailcowClient, MailcowError, MailcowNotConfigured, generate_password

CONF = dict(MAILCOW_BASE_URL="https://mailcow.test", MAILCOW_API_KEY="k")


def _client(handler) -> MailcowClient:
    c = MailcowClient(base_url="https://mailcow.test", api_key="k")
    c._client = httpx.Client(
        base_url="https://mailcow.test",
        headers={"X-API-Key": "k"},
        transport=httpx.MockTransport(handler),
    )
    return c


def test_erro_com_http_200_no_corpo_vira_excecao():
    def handler(request):
        return httpx.Response(
            200, json=[{"type": "danger", "msg": "access_denied", "log": ["mailbox", "edit"]}]
        )

    with pytest.raises(MailcowError) as exc:
        with _client(handler) as c:
            c.update_mailbox("x@v7m.org", active="1")

    assert exc.value.type == "danger"
    assert exc.value.msg == "access_denied"


def test_sucesso_passa():
    def handler(request):
        return httpx.Response(200, json=[{"type": "success", "msg": ["mailbox_added"]}])

    with _client(handler) as c:
        assert c.update_mailbox("x@v7m.org", active="1")


def test_lista_dominios():
    def handler(request):
        return httpx.Response(
            200, json=[{"domain_name": "v7m.org"}, {"domain_name": "ieadpg.org"}]
        )

    with _client(handler) as c:
        assert c.list_domains() == ["v7m.org", "ieadpg.org"]


def test_filtro_por_dominio_usa_o_caminho_certo():
    """`/get/mailbox/{x}` trata x como username: com domínio, devolve {} silencioso."""
    visto = {}

    def handler(request):
        visto["path"] = request.url.path
        return httpx.Response(200, json=[{"username": "bot@v7m.org"}])

    with _client(handler) as c:
        assert c.list_mailboxes("v7m.org") == [{"username": "bot@v7m.org"}]

    assert visto["path"] == "/api/v1/get/mailbox/all/v7m.org"


def test_ensure_cria_quando_nao_existe_e_devolve_a_senha():
    chamadas: list[tuple[str, str]] = []
    existe = {"sim": False}  # o GET só passa a achar a caixa DEPOIS do POST

    def handler(request):
        chamadas.append((request.method, request.url.path))
        if request.method == "POST":
            existe["sim"] = True
            return httpx.Response(200, json=[{"type": "success", "msg": ["mailbox_added"]}])
        if existe["sim"]:
            return httpx.Response(200, json={"username": "app@v7m.org", "active": 1})
        return httpx.Response(200, json={})  # mailcow devolve {} para caixa inexistente

    with _client(handler) as c:
        mailbox, senha, criada = c.ensure_mailbox(local_part="app", domain="v7m.org")

    assert criada is True
    assert senha and len(senha) >= 20
    assert mailbox["username"] == "app@v7m.org"
    assert ("POST", "/api/v1/add/mailbox") in chamadas


def test_ensure_reaproveita_caixa_existente_sem_trocar_senha():
    """Reprovisionar não pode invalidar o SMTP de um app que já roda."""
    posts = []

    def handler(request):
        if request.method == "POST":
            posts.append(request.url.path)
            return httpx.Response(200, json=[{"type": "success", "msg": []}])
        return httpx.Response(200, json={"username": "app@v7m.org", "active": 1})

    with _client(handler) as c:
        mailbox, senha, criada = c.ensure_mailbox(local_part="app", domain="v7m.org")

    assert criada is False
    assert senha is None  # mailcow não devolve senha existente
    assert posts == []


def test_ensure_com_rotate_troca_a_senha():
    posts = []

    def handler(request):
        if request.method == "POST":
            posts.append(request.url.path)
            return httpx.Response(200, json=[{"type": "success", "msg": []}])
        return httpx.Response(200, json={"username": "app@v7m.org", "active": 1})

    with _client(handler) as c:
        _mailbox, senha, criada = c.ensure_mailbox(
            local_part="app", domain="v7m.org", rotate_password=True
        )

    assert criada is False
    assert senha and len(senha) >= 20
    assert posts == ["/api/v1/edit/mailbox"]


@override_settings(MAILCOW_BASE_URL="", MAILCOW_API_KEY="")
def test_sem_configuracao_falha_explicito():
    with pytest.raises(MailcowNotConfigured):
        MailcowClient()


def test_senha_gerada_nao_tem_caractere_que_quebra_env():
    for _ in range(50):
        senha = generate_password()
        assert len(senha) == 24
        assert not set(senha) & set("\"'`$\\ \n")
