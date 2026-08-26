import json
import unittest

import httpx

from whatsapp.evolution_go import EvolutionGoDriver


class EvolutionGoDriverTests(unittest.IsolatedAsyncioTestCase):
    async def test_texto_usa_contrato_go(self):
        async def handler(request):
            self.assertEqual(request.url.path, "/send/text")
            self.assertEqual(request.headers["apikey"], "token-teste")
            self.assertEqual(
                json.loads(request.content),
                {"number": "5543999999999", "text": "Olá"},
            )
            return httpx.Response(200, json={"data": {"ok": True}})

        async with EvolutionGoDriver(
            base_url="http://go.test",
            api_key="token-teste",
            transport=httpx.MockTransport(handler),
        ) as driver:
            result = await driver.send_text("5543999999999", "Olá")

        self.assertTrue(result["data"]["ok"])

    async def test_phone_check_aceita_variantes_consolidadas(self):
        async def handler(request):
            self.assertEqual(request.url.path, "/user/check")
            return httpx.Response(
                200,
                json={
                    "data": {
                        "Users": [
                            {
                                "Query": "5543999999999",
                                "IsInWhatsapp": True,
                                "JID": "5543999999999@s.whatsapp.net",
                                "RemoteJID": "5543999999999@s.whatsapp.net",
                                "VerifiedName": "",
                            }
                        ]
                    }
                },
            )

        async with EvolutionGoDriver(
            base_url="http://go.test",
            api_key="token-teste",
            transport=httpx.MockTransport(handler),
        ) as driver:
            result = await driver.check_numbers(
                ["5543999999999", "554399999999"]
            )

        self.assertEqual(
            result,
            [
                {
                    "jid": "5543999999999@s.whatsapp.net",
                    "exists": True,
                    "number": "5543999999999",
                    "name": None,
                }
            ],
        )

    async def test_audio_usa_send_media_com_tipo_audio(self):
        async def handler(request):
            self.assertEqual(request.url.path, "/send/media")
            self.assertEqual(json.loads(request.content)["type"], "audio")
            return httpx.Response(200, json={"data": {"ok": True}})

        async with EvolutionGoDriver(
            base_url="http://go.test",
            api_key="token-teste",
            transport=httpx.MockTransport(handler),
        ) as driver:
            result = await driver.send_audio(
                "5543999999999",
                "http://backend.test/audio.mp3",
            )

        self.assertTrue(result["data"]["ok"])

    async def test_documento_informa_nome_decodificado(self):
        async def handler(request):
            payload = json.loads(request.content)
            self.assertEqual(payload["type"], "document")
            self.assertEqual(payload["filename"], "comprovante matrícula.pdf")
            return httpx.Response(200, json={"data": {"ok": True}})

        async with EvolutionGoDriver(
            base_url="http://go.test",
            api_key="token-teste",
            transport=httpx.MockTransport(handler),
        ) as driver:
            result = await driver.send_media(
                "5543999999999",
                "https://backend.test/media/comprovante%20matr%C3%ADcula.pdf?download=1",
                "document",
            )

        self.assertTrue(result["data"]["ok"])

    async def test_poll_manda_max_answer_e_selectable_count(self):
        async def handler(request):
            self.assertEqual(request.url.path, "/send/poll")
            payload = json.loads(request.content)
            self.assertEqual(payload["question"], "Qual a cor?")
            self.assertEqual(payload["options"], ["Azul", "Verde"])
            self.assertEqual(payload["maxAnswer"], 2)
            self.assertEqual(payload["selectableCount"], 2)
            return httpx.Response(200, json={"data": {"ok": True}})

        async with EvolutionGoDriver(
            base_url="http://go.test",
            api_key="token-teste",
            transport=httpx.MockTransport(handler),
        ) as driver:
            result = await driver.send_poll(
                "5543999999999",
                "Qual a cor?",
                ["Azul", "Verde"],
                selectable_count=2,
            )

        self.assertTrue(result["data"]["ok"])



def test_go_create_manda_o_token_da_instancia(monkeypatch, settings):
    """Sem token no payload a GO responde 400 — e o app acabaria usando a key
    global, ou seja, mandando pela instância de outro app."""
    import httpx

    from whatsapp import provisioning as wa

    settings.EVOLUTION_GO_BASE_URL = "http://go.invalid"
    settings.EVOLUTION_GO_ADMIN_KEY = "admin"
    enviados = {}

    class _Resp:
        status_code = 200

        def __init__(self, payload):
            self._payload = payload
            self.text = ""

        def json(self):
            return self._payload

    def _post(self, path, json=None, **k):
        enviados["path"] = path
        enviados["json"] = json
        return _Resp({"data": {"name": json["name"], "token": json["token"]}})

    monkeypatch.setattr(wa, "go_find_instance", lambda *a, **k: None)
    monkeypatch.setattr(httpx.Client, "post", _post)

    instancia, criada = wa.go_ensure_instance(instance_name="meuapp")
    assert criada is True
    assert enviados["json"]["name"] == "meuapp"
    assert enviados["json"]["token"], "a GO exige token no create"
    assert instancia["token"] == enviados["json"]["token"]
