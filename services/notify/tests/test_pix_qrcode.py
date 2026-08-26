from pathlib import Path

import pytest

from notify.models import Notification


pytestmark = pytest.mark.django_db


def test_notify_aceita_comando_pix(client, account):
    response = client.post(
        "/notify",
        data={
            "account_id": account.slug,
            "content": "Conclua o pagamento",
            "whatsapp": "5542999999999",
            "options": {
                "pix": {
                    "payload": "00020101021226890014br.gov.bcb.pix",
                    "label": "Matrícula",
                }
            },
        },
        content_type="application/json",
    )

    assert response.status_code == 200
    notification = Notification.objects.get(external_id=response.json()["external_id"])
    assert notification.extra == {
        "pix": {
            "payload": "00020101021226890014br.gov.bcb.pix",
            "label": "Matrícula",
        }
    }


def test_notify_aceita_qr_code_generico(client, account):
    response = client.post(
        "/notify",
        data={
            "account_id": account.slug,
            "content": "Aponte a câmera",
            "whatsapp": "5542999999999",
            "options": {
                "qr_code": {
                    "data": "https://v7m.org/convite/abc",
                    "caption": "Abra seu convite",
                }
            },
        },
        content_type="application/json",
    )

    assert response.status_code == 200
    notification = Notification.objects.get(external_id=response.json()["external_id"])
    assert notification.extra["qr_code"]["data"] == "https://v7m.org/convite/abc"


def test_notify_rejeita_comandos_ricos_ambiguos(client, account):
    response = client.post(
        "/notify",
        data={
            "account_id": account.slug,
            "content": "ambíguo",
            "whatsapp": "5542999999999",
            "options": {
                "pix": {"payload": "000201"},
                "qr_code": {"data": "https://v7m.org"},
            },
        },
        content_type="application/json",
    )

    assert response.status_code == 400
    assert "apenas um comando" in response.json()["detail"]


def test_gerador_de_qr_cria_png_deterministico(tmp_path, settings):
    from notify.qr import build_qr_media_url

    settings.MEDIA_ROOT = tmp_path
    settings.MEDIA_URL = "/media/"
    settings.EXTERNAL_URL = "http://notify.test"

    first = build_qr_media_url("abc-123", "conteúdo do QR")
    second = build_qr_media_url("abc-123", "conteúdo do QR")

    assert first == second
    assert first.startswith("http://notify.test/media/qr/abc-123-")
    files = list((Path(tmp_path) / "qr").glob("*.png"))
    assert len(files) == 1
    assert files[0].read_bytes().startswith(b"\x89PNG\r\n\x1a\n")


def test_dispatch_pix_envia_qr_com_copia_e_cola(account, monkeypatch):
    from notify import dispatch as dispatch_mod

    sent = {}

    class _Driver:
        name = "evolution-v2"
        last_reason = ""

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def resolve_br_number(self, phone):
            return phone

        async def send_media(self, number, url, media_type, caption=None):
            sent.update(number=number, url=url, media_type=media_type, caption=caption)
            return {"key": {"id": "PIX-1"}}

    monkeypatch.setattr(dispatch_mod, "_get_whatsapp_driver", lambda *_a, **_kw: _Driver())
    monkeypatch.setattr(
        "notify.qr.build_qr_media_url",
        lambda external_id, data: "http://notify.test/media/qr/pix.png",
    )
    notification = Notification.objects.create(
        account=account,
        caller="test",
        recipient_phone="5542999999999",
        text="Pague agora",
        want_whatsapp=True,
        email_status="skipped",
        extra={"pix": {"payload": "000201PIX", "label": "Matrícula"}},
    )

    dispatch_mod._send_whatsapp_qr(notification, command="pix")

    assert notification.whatsapp_status == "sent"
    assert sent["media_type"] == "image"
    assert "Matrícula" in sent["caption"]
    assert "000201PIX" in sent["caption"]
