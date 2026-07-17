"""Webhook Evolution — persiste InboundEvent."""

from __future__ import annotations

from ninja import Router, Schema
from ninja.errors import HttpError

router = Router(tags=["webhook"])


class EvolutionWebhookIn(Schema):
    event: str | None = None
    instance: str | None = None
    data: dict | None = None


@router.post("/evolution/{instance_name}", auth=None)
def evolution_webhook(request, instance_name: str, payload: EvolutionWebhookIn):
    """Persiste evento bruto da Evolution. Idempotente por wa_message_id."""
    from accounts.models import Account
    from channels.models import WhatsAppNumber
    from notify.models import InboundEvent

    # encontra a conta pelo instance_name
    wn = WhatsAppNumber.objects.filter(instance_name=instance_name).first()
    if wn is None:
        # aceita mas loga (não rejeita webhook — padrão do monólito)
        return {"status": "ignored", "reason": "unknown_instance"}

    data = payload.data or {}
    wa_msg_id = data.get("key", {}).get("id") or data.get("messageId") or ""

    if wa_msg_id:
        _, created = InboundEvent.objects.get_or_create(
            wa_message_id=wa_msg_id,
            defaults={
                "account": wn.account,
                "instance_name": instance_name,
                "payload": data,
            },
        )
        if not created:
            return {"status": "duplicate"}
    else:
        # sem message_id → salva mesmo assim (gera UUID no external_id)
        InboundEvent.objects.create(
            account=wn.account,
            instance_name=instance_name,
            wa_message_id=f"no-id-{InboundEvent.objects.count() + 1}",
            payload=data,
        )

    return {"status": "ok"}
