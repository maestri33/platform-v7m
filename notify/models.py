"""Models do notify-server — multi-tenant (cada model com FK Account).

Baseado no monólito (notify/models.py) + extensões do plano de desmembramento.
"""

from django.db import models

from core.models import ExternalIdModel

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
CHANNEL_TTS = "tts"
_ALL_CHANNELS = (CHANNEL_WHATSAPP, CHANNEL_EMAIL, CHANNEL_TTS)


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

    is_tts = models.BooleanField(default=False)
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
        if self.is_tts:
            flags.append("tts")
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

    want_whatsapp = models.BooleanField(default=True)
    want_email = models.BooleanField(default=False)
    want_tts = models.BooleanField(default=False)

    whatsapp_status = models.CharField(max_length=10, choices=_STATUS_CHOICES, default=STATUS_PENDING)
    email_status = models.CharField(max_length=10, choices=_STATUS_CHOICES, default=STATUS_PENDING)
    tts_status = models.CharField(max_length=10, choices=_STATUS_CHOICES, default=STATUS_PENDING)

    whatsapp_error = models.TextField(null=True, blank=True)
    email_error = models.TextField(null=True, blank=True)
    tts_error = models.TextField(null=True, blank=True)

    tts_audio_path = models.CharField(max_length=500, null=True, blank=True)

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


class InboundEvent(ExternalIdModel):
    """Payload bruto da Evolution — por instância (idempotente por wa_message_id)."""

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="inbound_events"
    )
    instance_name = models.CharField(max_length=100)
    wa_message_id = models.CharField(max_length=100, unique=True)
    payload = models.JSONField(default=dict)
    received_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Inbound({self.instance_name}/{self.wa_message_id})"
