"""Models do notify-server — multi-tenant (cada model com FK Account).

Baseado no monólito (notify/models.py) + extensões do plano de desmembramento.
"""

import uuid
from django.db import models


class ExternalIdModel(models.Model):
    """Base abstrata com external_id (UUID) de borda — nunca a PK."""

    external_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        abstract = True


# Status de envio por canal.
STATUS_PENDING = "pending"
STATUS_SENDING = "sending"
STATUS_SENT = "sent"
STATUS_FAILED = "failed"
STATUS_SKIPPED = "skipped"

_STATUS_CHOICES = [
    (STATUS_PENDING, "pendente"),
    (STATUS_SENDING, "enviando"),
    (STATUS_SENT, "enviado"),
    (STATUS_FAILED, "falhou"),
    (STATUS_SKIPPED, "ignorado"),
]

MEDIA_TYPES = ("image", "video", "audio", "document")

CHANNEL_WHATSAPP = "whatsapp"
CHANNEL_EMAIL = "email"
CHANNEL_SMS = "sms"
_ALL_CHANNELS = (CHANNEL_WHATSAPP, CHANNEL_EMAIL, CHANNEL_SMS)


def _parse_channels(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [c.strip().lower() for c in raw.split(",") if c.strip().lower() in _ALL_CHANNELS]


class Template(ExternalIdModel):
    """Teor editável de um evento — POR CONTA."""

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="templates"
    )
    event = models.SlugField(max_length=80, db_index=True)

    title = models.CharField(max_length=200, null=True, blank=True)
    subject = models.CharField(max_length=255, null=True, blank=True)
    body_md = models.TextField(help_text="Markdown. Placeholders {nome}, {nome-completo}, {valor}...")

    storytelling = models.BooleanField(default=False)
    story_prompt = models.TextField(null=True, blank=True)

    channels = models.CharField(max_length=40, default="whatsapp,email")
    media_url = models.CharField(max_length=500, null=True, blank=True)
    media_type = models.CharField(max_length=20, null=True, blank=True)
    mail_template = models.CharField(max_length=50, default="default")

    notes = models.CharField(max_length=200, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("account", "event")
        verbose_name = "template de notificação"
        verbose_name_plural = "templates de notificação"

    def __str__(self):
        flags = []
        if self.storytelling:
            flags.append("story")
        return f"Template({self.account.slug}/{self.event}" + (f" [{','.join(flags)}]" if flags else "") + ")"

    @property
    def channel_list(self) -> list[str]:
        return _parse_channels(self.channels)


class Trigger(ExternalIdModel):
    """QUANDO o evento dispara — POR CONTA."""

    template = models.OneToOneField(Template, on_delete=models.CASCADE, related_name="trigger")
    fires_on = models.CharField(max_length=200, blank=True, default="")
    source = models.CharField(max_length=100, null=True, blank=True)
    delay_minutes = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "gatilho de notificação"
        verbose_name_plural = "gatilhos de notificação"

    def __str__(self):
        state = "ativo" if self.active else "inativo"
        return f"Trigger({self.template_id}, {state}: {self.fires_on})"


class Notification(ExternalIdModel):
    """Uma notificação despachada — POR CONTA."""

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="notifications"
    )
    whatsapp_number = models.ForeignKey(
        "channels.WhatsAppNumber", on_delete=models.SET_NULL, null=True, blank=True
    )

    idempotency_key = models.CharField(max_length=255, null=True, blank=True)
    caller = models.CharField(max_length=100)

    recipient_phone = models.CharField(max_length=32, null=True, blank=True)
    recipient_email = models.EmailField(null=True, blank=True)

    title = models.CharField(max_length=200, null=True, blank=True)
    text = models.TextField()
    subject = models.CharField(max_length=255, null=True, blank=True)
    mail_template = models.CharField(max_length=50, default="default")

    media_url = models.CharField(max_length=500, null=True, blank=True)
    media_type = models.CharField(max_length=20, null=True, blank=True)

    gender = models.CharField(max_length=1, null=True, blank=True)

    # Payloads específicos de canal que precisam sobreviver à fila (ex.:
    # {"poll": {"question": ..., "options": [...]}} — recurso GO-first).
    extra = models.JSONField(default=dict, blank=True)

    want_whatsapp = models.BooleanField(default=True)
    want_email = models.BooleanField(default=False)

    whatsapp_status = models.CharField(max_length=10, choices=_STATUS_CHOICES, default=STATUS_PENDING)
    email_status = models.CharField(max_length=10, choices=_STATUS_CHOICES, default=STATUS_PENDING)

    whatsapp_error = models.TextField(null=True, blank=True)
    email_error = models.TextField(null=True, blank=True)

    # Slot de SMS — sem provedor ainda; nasce `skipped` (ver CHANNEL_SMS).
    want_sms = models.BooleanField(default=False)
    sms_status = models.CharField(max_length=10, choices=_STATUS_CHOICES, default=STATUS_SKIPPED)
    sms_error = models.TextField(null=True, blank=True)

    # ── Rastro do provedor ──────────────────────────────────────────────────
    # `sent` só quer dizer "o provedor aceitou". Guardar o id da mensagem é o
    # que permite casar o MESSAGES_UPDATE que chega depois (entregue/lido) com
    # esta linha — sem isso, o webhook de status não tem em quem encostar.
    provider_message_id = models.CharField(max_length=120, null=True, blank=True, db_index=True)
    driver_used = models.CharField(max_length=20, blank=True, default="")
    # POR QUE saiu por esse provedor: vazio = preferido de primeira; senão,
    # "retry ok (2ª tentativa)" ou "evolution-go: ...".
    driver_reason = models.CharField(max_length=220, blank=True, default="")
    delivery_status = models.CharField(max_length=12, blank=True, default="")
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["account", "idempotency_key"],
                condition=~models.Q(idempotency_key=None),
                name="uniq_account_idempotency_key",
            ),
        ]

    def __str__(self):
        return f"Notification({self.external_id}, caller={self.caller})"


class ServiceStatus(models.Model):
    """Última verdade conhecida sobre cada serviço — escrita pelo watchdog.

    O dashboard NÃO consulta os serviços a cada pageview: mostra isto, com o
    `checked_at` dizendo de quando é a informação. Transições ok↔fora ficam em
    `changed_at` e disparam alerta ao admin + evento `service` nos webhooks.
    """

    name = models.CharField(max_length=40, unique=True)  # evolution-go, mailcow, omnirouter, queue, canary
    ok = models.BooleanField(default=False)
    detail = models.CharField(max_length=300, blank=True, default="")
    checked_at = models.DateTimeField(null=True, blank=True)
    changed_at = models.DateTimeField(null=True, blank=True)  # última transição ok<->fora
    heal_attempted_at = models.DateTimeField(null=True, blank=True)  # cooldown do auto-heal
    alerted_at = models.DateTimeField(null=True, blank=True)  # cooldown de alerta

    class Meta:
        verbose_name = "status de serviço"
        verbose_name_plural = "status de serviços"

    def __str__(self):
        return f"{self.name}: {'ok' if self.ok else 'fora'}"


class InboundEvent(ExternalIdModel):
    """Payload bruto da Evolution — por instância (idempotente por wa_message_id)."""

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="inbound_events"
    )
    instance_name = models.CharField(max_length=100)
    wa_message_id = models.CharField(max_length=100, unique=True)
    payload = models.JSONField(default=dict)
    # Derivados do payload na entrada: o dashboard e o webhook do app precisam
    # de remetente e prévia sem reprocessar JSON bruto a cada leitura.
    from_number = models.CharField(max_length=32, blank=True, default="", db_index=True)
    preview = models.CharField(max_length=280, blank=True, default="")
    forwarded = models.BooleanField(default=False)
    received_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Inbound({self.instance_name}/{self.wa_message_id})"


class WebhookEvent(models.Model):
    """Log bruto de TODO webhook recebido das Evolutions — a página /webhook.

    Diferente do InboundEvent (que deduplica e interpreta mensagens), aqui é
    registro de auditoria: cada POST que chega em /v1/webhook/evolution/{inst}
    vira uma linha, exista ou não instância correspondente, seja qual for o
    evento. Retenção por contagem (WEBHOOK_LOG_MAX, default 500).
    """

    received_at = models.DateTimeField(auto_now_add=True, db_index=True)
    instance_name = models.CharField(max_length=100, db_index=True)
    event = models.CharField(max_length=64, blank=True, default="", db_index=True)
    # Derivados baratos na escrita, pra lista renderizar sem reparsear JSON.
    from_number = models.CharField(max_length=32, blank=True, default="")
    preview = models.CharField(max_length=200, blank=True, default="")
    payload = models.JSONField(default=dict)

    def __str__(self):
        return f"Webhook({self.instance_name}/{self.event or '—'} @ {self.received_at:%H:%M:%S})"
