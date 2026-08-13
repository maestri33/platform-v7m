"""FASE 2 do dispatch — escolhe e chama o canal certo para cada notificação.

Recebe do `notify.dispatch` a decisão já tomada na FASE 1 (claim): quais
canais estão pendentes, se é uma recuperação de job interrompido, etc. Aqui
só decide o fluxo de envio.

Decisões de canal:
  - WhatsApp + recovery: cancela TTS pendente e envia texto.
  - WhatsApp + mídia: envia mídia (mata TTS pendente).
  - WhatsApp + TTS: gera voz.
  - WhatsApp + texto: envia texto.
  - TTS sem WhatsApp: impossível — TTS é sempre via WhatsApp.
  - E-mail: independente.
"""

from __future__ import annotations

import logging

from notify.channels import email, tts, whatsapp
from notify.models import (
    Notification,
    STATUS_FAILED,
    STATUS_SENDING,
    STATUS_SKIPPED,
)

logger = logging.getLogger(__name__)


def dispatch_channels(
    notif: Notification,
    *,
    do_whatsapp: bool,
    wa_recover: bool,
    do_email: bool,
    tts_pending: bool,
) -> None:
    """Roteia a notificação para os canais corretos. Não captura exceções
    de canal — cada canal já trata as suas via `mark_channel_failed`.

    O estado `STATUS_SENDING` já foi gravado na FASE 1 do dispatch. Aqui só
    substituímos por SENT / FAILED / SKIPPED.
    """
    if do_whatsapp:
        if wa_recover:
            # recuperação: TTS pendente vira FAILED (não dá pra retomar geração)
            if notif.tts_status == STATUS_SENDING:
                notif.tts_status = STATUS_FAILED
                notif.tts_error = "recuperado como texto (envio anterior interrompido)"
            whatsapp.send_text(notif)
        elif notif.media_url:
            if tts_pending:
                notif.tts_status = STATUS_SKIPPED
            whatsapp.send_media(notif)
        elif notif.want_tts:
            tts.send(notif)
        else:
            whatsapp.send_text(notif)
    elif tts_pending:
        # TTS só é entregue via WhatsApp — se WhatsApp não quer, ignora
        notif.tts_status = STATUS_SKIPPED

    if do_email:
        email.send(notif)
