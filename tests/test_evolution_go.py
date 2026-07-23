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
