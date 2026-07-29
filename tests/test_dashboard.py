"""Dashboard editável — cada bloco salva de verdade e devolve o painel.

O dashboard não tem login por decisão de arquitetura (quem tranca é o Caddy),
então o que precisa ser garantido aqui é o contrário do de sempre: que os
formulários realmente gravem, e que os casos ruins não gravem lixo.
"""

import pytest

from channels.models import (
    DRIVER_GO,
    DRIVER_V2,
    AppWebhook,
    MailIdentity,
    MailTemplate,
    TtsVoices,
    WhatsAppNumber,
)


@pytest.mark.django_db
def test_home_lista_apps(client, account):
    resp = client.get("/")
    assert resp.status_code == 200
    assert account.slug in resp.content.decode()


@pytest.mark.django_db
def test_painel_do_app_abre(client, account):
    resp = client.get(f"/dashboard/app/{account.slug}/")
    assert resp.status_code == 200
    corpo = resp.content.decode()
    for aba in ("whatsapp", "e-mail", "webhook", "recebidas"):
        assert aba in corpo


@pytest.mark.django_db
def test_app_inexistente_devolve_404(client, db):
    assert client.get("/dashboard/app/nao-existe/").status_code == 404


@pytest.mark.django_db
def test_salva_whatsapp_com_cadeia_de_fallback(client, account):
    resp = client.post(f"/dashboard/app/{account.slug}/whatsapp", {
        "slug": "principal", "instance_name": "testes", "phone_number": "554299999999",
        "driver": DRIVER_V2, "fallback_driver": DRIVER_GO, "is_default": "1",
    })
    assert resp.status_code == 200
    numero = WhatsAppNumber.objects.get(account=account, slug="principal")
    assert numero.driver_chain == [DRIVER_V2, DRIVER_GO]
    assert numero.phone_number == "554299999999"


@pytest.mark.django_db
def test_fallback_igual_ao_driver_e_descartado(client, account):
    """Cair no mesmo provedor não é fallback — é tentar duas vezes o que já falhou."""
    client.post(f"/dashboard/app/{account.slug}/whatsapp", {
        "slug": "principal", "instance_name": "t", "driver": DRIVER_V2, "fallback_driver": DRIVER_V2,
    })
    assert WhatsAppNumber.objects.get(account=account).fallback_driver == ""


@pytest.mark.django_db
def test_token_da_go_vazio_nao_apaga_o_atual(client, account):
    numero = WhatsAppNumber.objects.create(
        account=account, instance_name="t", slug="principal", driver=DRIVER_V2
    )
    numero.set_go_token("token-original")
    numero.save()
    client.post(f"/dashboard/app/{account.slug}/whatsapp", {
        "slug": "principal", "instance_name": "t", "driver": DRIVER_V2, "go_token": "",
    })
    numero.refresh_from_db()
    assert numero.go_api_key() == "token-original"


@pytest.mark.django_db
def test_salva_remetente_e_cifra_a_senha(client, account):
    client.post(f"/dashboard/app/{account.slug}/mail", {
        "from_email": "noreply@v7m.org", "from_name": "V7M", "smtp_host": "mail.v7m.org",
        "smtp_port": "587", "smtp_user": "noreply@v7m.org", "smtp_password": "senha-real",
    })
    identity = MailIdentity.objects.get(account=account)
    assert identity.is_default
    assert identity.smtp_password != "senha-real"


@pytest.mark.django_db
def test_senha_vazia_mantem_a_atual(client, account):
    from mail import crypto

    MailIdentity.objects.create(
        account=account, from_email="noreply@v7m.org", from_name="V7M", smtp_host="h",
        smtp_port=587, smtp_user="u", smtp_password=crypto.encrypt("antiga"),
    )
    client.post(f"/dashboard/app/{account.slug}/mail", {
        "from_email": "noreply@v7m.org", "from_name": "V7M Novo",
    })
    identity = MailIdentity.objects.get(account=account)
    assert crypto.decrypt(identity.smtp_password) == "antiga"
    assert identity.from_name == "V7M Novo"


@pytest.mark.django_db
def test_shell_de_email_sem_placeholder_e_recusado(client, account):
    resp = client.post(f"/dashboard/app/{account.slug}/mailtemplate", {
        "html": "<html><body>sem o marcador</body></html>", "brand_name": "X",
    })
    assert "{{content}}" in resp.content.decode()
    assert MailTemplate.objects.filter(account=account).count() == 0


@pytest.mark.django_db
def test_shell_valido_e_salvo(client, account):
    client.post(f"/dashboard/app/{account.slug}/mailtemplate", {
        "html": "<html><body><h1>{{title}}</h1>{{content}}</body></html>",
        "brand_name": "Marca Nova", "accent_color": "#ff0000",
    })
    shell = MailTemplate.objects.get(account=account)
    assert shell.brand_name == "Marca Nova"
    assert shell.is_valid


@pytest.mark.django_db
def test_preview_renderiza_o_shell_da_conta(client, account):
    MailTemplate.objects.create(
        account=account, html="<html><body>MARCADOR-UNICO {{content}}</body></html>",
        brand_name="Marca",
    )
    resp = client.get(f"/dashboard/app/{account.slug}/mailtemplate/preview")
    assert "MARCADOR-UNICO" in resp.content.decode()


@pytest.mark.django_db
def test_salva_vozes(client, account):
    client.post(f"/dashboard/app/{account.slug}/tts", {
        "voice_male": "Voz_A", "voice_female": "Voz_B",
    })
    voices = TtsVoices.objects.get(account=account)
    assert voices.voice_for_gender("M") == "Voz_A"
    assert voices.voice_for_gender("F") == "Voz_B"


@pytest.mark.django_db
def test_webhook_salva_e_url_vazia_remove(client, account):
    client.post(f"/dashboard/app/{account.slug}/webhook", {
        "url": "http://app.invalid/hook", "events": ["status"], "active": "1",
    })
    hook = AppWebhook.objects.get(account=account)
    assert hook.event_list == ["status"]
    assert hook.wants("status") and not hook.wants("inbound")

    client.post(f"/dashboard/app/{account.slug}/webhook", {"url": ""})
    assert AppWebhook.objects.filter(account=account).count() == 0


@pytest.mark.django_db
def test_gerar_key_mostra_o_valor_uma_vez(client, account):
    antes = account.api_keys.count()
    resp = client.post(f"/dashboard/app/{account.slug}/key", {"label": "backend"})
    assert account.api_keys.count() == antes + 1
    assert "não aparece de novo" in resp.content.decode()


@pytest.mark.django_db
def test_teste_de_envio_sem_destino_avisa(client, account):
    resp = client.post(f"/dashboard/app/{account.slug}/test-send", {"text": "oi"})
    assert "informe telefone ou e-mail" in resp.content.decode()


@pytest.mark.django_db
def test_assets_htmx_e_alpine_sao_servidos(client, db):
    for url in ("/dashboard/htmx.js", "/dashboard/alpine.js"):
        resp = client.get(url)
        assert resp.status_code == 200
        assert resp["Content-Type"].startswith("application/javascript")
