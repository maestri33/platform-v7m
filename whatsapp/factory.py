"""Roteamento entre Evolution v2 e GO sem duplicar entregas."""

import logging

from whatsapp.errors import DeliveryRejected

logger = logging.getLogger(__name__)


class FallbackDriver:
    def __init__(
        self,
        instance_name="default",
        *,
        primary=None,
        fallback=None,
        allow_alternate_sender=False,
    ):
        if primary is None:
            from whatsapp.evolution_v2 import EvolutionV2Driver

            primary = EvolutionV2Driver(instance_name)
        if fallback is None:
            from whatsapp.evolution_go import EvolutionGoDriver

            fallback = EvolutionGoDriver()
        self.primary = primary
        self.fallback = fallback
        self.allow_alternate_sender = allow_alternate_sender

    async def resolve_br_number(self, phone):
        digits = "".join(c for c in phone if c.isdigit())
        variants = [digits]
        if digits.startswith("55") and len(digits) in (12, 13):
            prefix, rest = digits[:4], digits[4:]
            if len(rest) == 9 and rest.startswith("9"):
                variants = [digits, prefix + rest[1:]]
            elif len(rest) == 8:
                variants = [prefix + "9" + rest, digits]
        if len(variants) == 1:
            return digits or phone
        try:
            results = await self.check_numbers(variants)
            return next((item["number"] for item in results if item["exists"]), digits)
        except Exception as exc:
            logger.warning("whatsapp.resolve_br.check_failed error=%s", type(exc).__name__)
            return digits

    def __getattr__(self, name):
        async def call(*args, **kwargs):
            primary_method = getattr(self.primary, name, None)
            if primary_method:
                try:
                    return await primary_method(*args, **kwargs)
                except DeliveryRejected as exc:
                    if not self.allow_alternate_sender:
                        raise
                    logger.warning(
                        "whatsapp.alternate_sender operation=%s error=%s",
                        name,
                        type(exc).__name__,
                    )
                except Exception as exc:
                    logger.warning(
                        "whatsapp.primary_state_unknown operation=%s error=%s",
                        name, type(exc).__name__,
                    )
                    raise

            fallback_method = getattr(self.fallback, name, None)
            if fallback_method:
                return await fallback_method(*args, **kwargs)
            raise NotImplementedError(f"WhatsApp não suporta {name}")

        return call

    async def aclose(self):
        await self.primary.aclose()
        await self.fallback.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.aclose()


def get_driver(instance_name: str = "default", *, allow_alternate_sender: bool = False):
    return FallbackDriver(
        instance_name,
        allow_alternate_sender=allow_alternate_sender,
    )
