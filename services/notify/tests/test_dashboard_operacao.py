"""Painel: instância própria por app, conteúdo das mensagens e diagnóstico de voz.

O que estes testes travam é o erro que ficou visível em produção: três contas
apontando para a mesma instância — três apps mandando do mesmo WhatsApp.
"""

import pytest

from accounts.models import Account
from channels.models import DRIVER_GO, WhatsAppNumber
from notify.models import InboundEvent, Notification


@pytest.fixture
def outra_conta(db):
    return Account.objects.create(slug="outro-app", name="Outro App")


@pytest.mark.django_db
def test_painel_avisa_quando_dois_apps_dividem_a_instancia(client, account, outra_conta):
    for conta in (account, outra_conta):
        WhatsAppNumber.objects.create(
            account=conta, slug="principal", instance_name="default",
            driver=DRIVER_GO, is_default=True,
        )
    corpo = client.get(f"/dashboard/app/{account.slug}/").content.decode()
    assert "mesmo WhatsApp de outro app" in corpo
    assert "outro-app" in corpo


@pytest.mark.django_db
def test_sem_conflito_nao_ha_alarme_falso(client, account, outra_conta):
    WhatsAppNumber.objects.create(
        account=account, slug="principal", instance_name="testes", driver=DRIVER_GO
    )
    WhatsAppNumber.objects.create(
        account=outra_conta, slug="principal", instance_name="outro-app", driver=DRIVER_GO
    )
    assert "mesmo WhatsApp de outro app" not in client.get(
        f"/dashboard/app/{account.slug}/"
    ).content.decode()


@pytest.mark.django_db
def test_provisionar_instancia_grava_nome_e_token(client, account, monkeypatch):
    """O botão precisa criar a instância no provedor, não só renomear o ponteiro."""
    from whatsapp import provisioning as wa

    monkeypatch.setattr(wa, "go_ensure_instance", lambda **k: ({"token": "tok-do-app"}, True))
    monkeypatch.setattr(wa, "go_set_webhook", lambda *a, **k: None)

    resp = client.post(f"/dashboard/app/{account.slug}/whatsapp/provision", {
        "instance_name": "meuapp", "phone_number": "554299999999",
    })
    assert resp.status_code == 200
    numero = WhatsAppNumber.objects.get(account=account)
    assert numero.instance_name == "meuapp"
    assert numero.phone_number == "554299999999"
    assert numero.go_api_key() == "tok-do-app"  # token da instância, não a key global


@pytest.mark.django_db
def test_provisionar_reporta_falha_parcial_sem_perder_o_que_deu_certo(client, account, monkeypatch):
    from whatsapp import provisioning as wa

    def _explode(**_k):
        raise wa.ProvisioningError("go create 500")

    monkeypatch.setattr(wa, "go_ensure_instance", _explode)

    corpo = client.post(f"/dashboard/app/{account.slug}/whatsapp/provision", {
        "instance_name": "meuapp",
    }).content.decode()
    assert "parcial" in corpo
    assert "evolution go: falhou" in corpo
    assert WhatsAppNumber.objects.filter(account=account).exists()


@pytest.mark.django_db
def test_detalhe_do_envio_mostra_o_conteudo(client, account):
    n = Notification.objects.create(
        account=account, caller="app.otp", recipient_phone="5542988887777",
        text="Seu código é 445566", subject="Código", whatsapp_status="failed",
        whatsapp_error="WhatsAppGoError: 500", want_whatsapp=True,
    )
    corpo = client.get(f"/dashboard/app/{account.slug}/msg/{n.external_id}").content.decode()
    assert "Seu código é 445566" in corpo
    assert "WhatsAppGoError: 500" in corpo


@pytest.mark.django_db
def test_detalhe_aceita_a_chave_de_idempotencia(client, account):
    Notification.objects.create(
        account=account, caller="t", recipient_phone="5542988887777",
        text="corpo por chave", idempotency_key="otp-123",
    )
    assert "corpo por chave" in client.get(
        f"/dashboard/app/{account.slug}/msg/otp-123"
    ).content.decode()


@pytest.mark.django_db
def test_nao_da_para_ler_a_mensagem_de_outra_conta(client, account, outra_conta):
    alheia = Notification.objects.create(
        account=outra_conta, caller="t", recipient_phone="5542911112222", text="segredo alheio"
    )
    resp = client.get(f"/dashboard/app/{account.slug}/msg/{alheia.external_id}")
    assert resp.status_code == 404
    assert "segredo alheio" not in resp.content.decode()


@pytest.mark.django_db
def test_lista_de_envios_busca_pelo_texto(client, account):
    Notification.objects.create(account=account, caller="a", recipient_phone="1", text="matrícula confirmada")
    Notification.objects.create(account=account, caller="b", recipient_phone="2", text="boleto vencido")
    corpo = client.get(f"/dashboard/app/{account.slug}/sent?q=boleto").content.decode()
    assert "boleto vencido" in corpo
    assert "matrícula confirmada" not in corpo


@pytest.mark.django_db
def test_recebida_mostra_conteudo_e_payload(client, account):
    e = InboundEvent.objects.create(
        account=account, instance_name="testes", wa_message_id="M9",
        from_number="554288887777", preview="quero saber do curso",
        payload={"message": {"conversation": "quero saber do curso"}},
    )
    corpo = client.get(f"/dashboard/app/{account.slug}/in/{e.external_id}").content.decode()
    assert "quero saber do curso" in corpo
    assert "payload bruto" in corpo


@pytest.mark.django_db
def test_instancia_nova_nasce_inativa_e_nao_derruba_o_envio(client, account, monkeypatch):
    """Trocar o ponteiro para uma instância sem sessão pararia o app na hora."""
    from whatsapp import provisioning as wa

    em_uso = WhatsAppNumber.objects.create(
        account=account, slug="principal", instance_name="default",
        driver=DRIVER_GO, is_default=True,
    )
    monkeypatch.setattr(wa, "go_ensure_instance", lambda **k: ({"token": "tok-novo"}, True))
    monkeypatch.setattr(wa, "go_set_webhook", lambda *a, **k: None)

    corpo = client.post(f"/dashboard/app/{account.slug}/whatsapp/provision", {
        "instance_name": "so-do-testes", "phone_number": "554299999999",
    }).content.decode()

    em_uso.refresh_from_db()
    assert em_uso.is_default is True          # produção intacta
    nova = WhatsAppNumber.objects.get(account=account, instance_name="so-do-testes")
    assert nova.is_default is False
    assert nova.go_api_key() == "tok-novo"
    assert "inativa" in corpo


@pytest.mark.django_db
def test_ativar_recusa_instancia_sem_sessao(client, account, monkeypatch):
    WhatsAppNumber.objects.create(
        account=account, slug="principal", instance_name="default", driver=DRIVER_GO, is_default=True
    )
    nova = WhatsAppNumber.objects.create(
        account=account, slug="nova", instance_name="nova", driver=DRIVER_GO, is_default=False
    )
    from whatsapp import factory

    class _Fora:
        name = "evolution-go"

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def health(self):
            return {"data": {"Connected": False, "LoggedIn": False}}

    monkeypatch.setattr(factory, "build_driver", lambda *a, **k: _Fora())
    corpo = client.post(f"/dashboard/app/{account.slug}/whatsapp/nova/activate").content.decode()
    nova.refresh_from_db()
    assert nova.is_default is False
    assert "ainda não está logada" in corpo


@pytest.mark.django_db
def test_ativar_promove_quando_a_sessao_esta_de_pe(client, account, monkeypatch):
    antiga = WhatsAppNumber.objects.create(
        account=account, slug="principal", instance_name="default", driver=DRIVER_GO, is_default=True
    )
    nova = WhatsAppNumber.objects.create(
        account=account, slug="nova", instance_name="nova", driver=DRIVER_GO, is_default=False
    )
    from whatsapp import factory

    class _Logada:
        name = "evolution-go"

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def health(self):
            return {"data": {"Connected": True, "LoggedIn": True}}

    monkeypatch.setattr(factory, "build_driver", lambda *a, **k: _Logada())
    client.post(f"/dashboard/app/{account.slug}/whatsapp/nova/activate")
    nova.refresh_from_db()
    antiga.refresh_from_db()
    assert nova.is_default is True
    assert antiga.is_default is False


@pytest.mark.django_db
def test_estado_gravado_cabe_na_coluna(client, account, monkeypatch):
    """SQLite não valida max_length e Postgres valida: sem full_clean, um rótulo
    grande demais só aparece como 500 em produção."""
    from whatsapp import provisioning as wa

    monkeypatch.setattr(wa, "go_ensure_instance", lambda **k: ({"token": "t"}, True))
    monkeypatch.setattr(wa, "go_set_webhook", lambda *a, **k: None)

    client.post(f"/dashboard/app/{account.slug}/whatsapp/provision", {"instance_name": "app-x"})
    numero = WhatsAppNumber.objects.get(account=account, instance_name="app-x")
    numero.full_clean(exclude=["account"])  # levanta se algum campo estourar a coluna


@pytest.mark.django_db
def test_qr_e_pareamento_agem_na_instancia_pedida_nao_na_default(client, account, monkeypatch):
    """Quem pede QR quer parear a instância NOVA — que por definição ainda não
    é a default."""
    em_uso = WhatsAppNumber.objects.create(
        account=account, slug="principal", instance_name="default",
        driver=DRIVER_GO, is_default=True, phone_number="554220181533",
    )
    em_uso.set_go_token("tok-antigo")
    em_uso.save()
    nova = WhatsAppNumber.objects.create(
        account=account, slug="nova", instance_name="nova", driver=DRIVER_GO,
        is_default=False, phone_number="554299999999",
    )
    nova.set_go_token("tok-novo")
    nova.save()

    from whatsapp import provisioning as wa

    vistos = {}
    monkeypatch.setattr(
        wa, "go_pairing_code",
        lambda token, phone: vistos.update(token=token, phone=phone) or "ABCD-1234",
    )
    corpo = client.post(f"/dashboard/app/{account.slug}/pair", {"number_slug": "nova"}).content.decode()
    assert vistos["token"] == "tok-novo"
    assert vistos["phone"] == "554299999999"
    assert "nova" in corpo


@pytest.mark.django_db
def test_reconnect_instance_usa_eventos_reais_da_go(client, account, monkeypatch):
    numero = WhatsAppNumber.objects.create(
        account=account, slug="principal", instance_name="testes", driver=DRIVER_GO, is_default=True
    )
    numero.set_go_token("tok-instancia")
    numero.save()

    import httpx

    chamadas = []

    def _mock_post(url, headers=None, json=None, timeout=None):
        chamadas.append({"url": url, "headers": headers, "json": json})
        class _Resp:
            status_code = 200
        return _Resp()

    def _mock_get(url, headers=None, timeout=None):
        class _Resp:
            status_code = 200
            def json(self):
                return {"data": {"LoggedIn": True, "Name": "testes"}}
        return _Resp()

    import time
    monkeypatch.setattr(time, "sleep", lambda s: None)
    monkeypatch.setattr(httpx, "post", _mock_post)
    monkeypatch.setattr(httpx, "get", _mock_get)

    resp = client.post(f"/dashboard/app/{account.slug}/whatsapp/reconnect")
    assert resp.status_code == 200
    assert len(chamadas) == 1
    assert chamadas[0]["json"]["subscribe"] == ["MESSAGE", "READ_RECEIPT", "HISTORY_SYNC"]
    assert chamadas[0]["json"]["immediate"] is True

