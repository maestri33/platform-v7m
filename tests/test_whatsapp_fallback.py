import unittest

from whatsapp.factory import FallbackDriver
from whatsapp.errors import DeliveryRejected


class FakeDriver:
    def __init__(self, *, error=None):
        self.error = error
        self.calls = []
        self.closed = False

    async def send_text(self, number, text):
        self.calls.append((number, text))
        if self.error:
            raise self.error
        return {"driver": self.__class__.__name__}

    async def aclose(self):
        self.closed = True


class PollDriver(FakeDriver):
    async def send_poll(self, number, question, options):
        self.calls.append((number, question, options))
        return {"poll": True}


class WhatsAppFallbackTests(unittest.IsolatedAsyncioTestCase):
    async def test_resolve_numero_br_uma_vez_pelo_fallback(self):
        primary, fallback = FakeDriver(), FakeDriver()

        async def check_numbers(numbers):
            self.assertEqual(numbers, ["5543999999999", "554399999999"])
            return [{"number": numbers[1], "exists": True}]

        primary.check_numbers = check_numbers
        async with FallbackDriver(primary=primary, fallback=fallback) as driver:
            result = await driver.resolve_br_number("+55 (43) 99999-9999")
        self.assertEqual(result, "554399999999")

    async def test_usa_v2_quando_funciona(self):
        primary, fallback = FakeDriver(), FakeDriver()
        async with FallbackDriver(primary=primary, fallback=fallback) as driver:
            await driver.send_text("5511", "Olá")
        self.assertEqual(primary.calls, [("5511", "Olá")])
        self.assertEqual(fallback.calls, [])
        self.assertTrue(primary.closed and fallback.closed)

    async def test_nao_cai_para_go_quando_estado_do_v2_e_inconclusivo(self):
        primary, fallback = FakeDriver(error=RuntimeError("offline")), FakeDriver()
        with self.assertRaisesRegex(RuntimeError, "offline"):
            async with FallbackDriver(
                primary=primary,
                fallback=fallback,
                allow_alternate_sender=True,
            ) as driver:
                await driver.send_text("5511", "Olá")
        self.assertEqual(fallback.calls, [])

    async def test_cai_para_go_quando_recurso_nao_existe_na_v2(self):
        primary, fallback = FakeDriver(), PollDriver()
        async with FallbackDriver(primary=primary, fallback=fallback) as driver:
            result = await driver.send_poll("5511", "Escolha", ["A", "B"])
        self.assertEqual(result, {"poll": True})

    async def test_cai_para_go_quando_v2_rejeita_e_solicitacao_autoriza(self):
        primary = FakeDriver(error=DeliveryRejected("payload rejeitado"))
        fallback = FakeDriver()

        async with FallbackDriver(
            primary=primary,
            fallback=fallback,
            allow_alternate_sender=True,
        ) as driver:
            await driver.send_text("5511", "Olá")

        self.assertEqual(fallback.calls, [("5511", "Olá")])
