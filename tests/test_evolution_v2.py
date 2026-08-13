import unittest

import httpx

from whatsapp.errors import DeliveryRejected
from whatsapp.evolution_v2 import EvolutionV2Driver


class EvolutionV2DeliveryTests(unittest.IsolatedAsyncioTestCase):
    async def test_resposta_422_confirma_que_entrega_foi_rejeitada(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(422, json={"error": "invalid payload"})

        driver = EvolutionV2Driver(
            "principal",
            base_url="http://evolution-v2.test",
            api_key="test-key",
            transport=httpx.MockTransport(handler),
        )

        try:
            with self.assertRaisesRegex(DeliveryRejected, "422"):
                await driver.send_text("5511", "Olá")
        finally:
            await driver.aclose()
