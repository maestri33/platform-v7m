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
    active = models.BooleanField(default=True, db_index=True)

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
        return f"Template({self.account.slug}/{self.event})"

    @property
    def channel_list(self) -> list[str]:
        return _parse_channels(self.channels)


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
    allow_alternate_sender = models.BooleanField(default=False)

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


class Incident(models.Model):
    STATUS_OPEN = "open"
    STATUS_RESOLVED = "resolved"
    STATUS_CHOICES = [(STATUS_OPEN, "aberta"), (STATUS_RESOLVED, "resolvida")]

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="incidents"
    )
    notifications = models.ManyToManyField(Notification, related_name="incidents")
    channel = models.CharField(max_length=20)
    category = models.SlugField(max_length=80)
    summary = models.CharField(max_length=200)
    detail = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_OPEN)
    occurrences = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["account", "channel", "category"],
                name="uniq_incident_cause_per_account",
            )
        ]
        ordering = ["-updated_at"]


# ── Solicitações de template (workflow de aprovação) ────────────────────────


class TemplateRequest(models.Model):
    """Sugestão de template submetida por um caller. Staff aprova ou rejeita."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    STATUS_CHOICES = [
        (PENDING, "pendente"),
        (APPROVED, "aprovada"),
        (REJECTED, "rejeitada"),
    ]

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="template_requests"
    )
    event = models.SlugField(max_length=80, db_index=True)
    title = models.CharField(max_length=200, blank=True)
    subject = models.CharField(max_length=255, blank=True)
    body_md = models.TextField(help_text="Markdown proposto. Placeholders {nome}, {nome-completo}…")
    is_tts = models.BooleanField(default=False)
    channels = models.CharField(max_length=40, default="whatsapp,email")
    media_url = models.CharField(max_length=500, blank=True)
    media_type = models.CharField(max_length=20, blank=True)
    mail_template = models.CharField(max_length=50, blank=True, default="default")
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=PENDING
    )
    requested_by = models.CharField(max_length=100)
    reviewer_notes = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]
        indexes = [models.Index(fields=["account", "status"])]


# ── Reclamações (smoke test + auditoria geral) ─────────────────────────────


class Complaint(models.Model):
    """Registro de reclamação / problema. Pode vir de smoke test ou de uso."""

    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    STATUS_CHOICES = [
        (OPEN, "aberta"),
        (ACKNOWLEDGED, "em análise"),
        (RESOLVED, "resolvida"),
    ]

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.SET_NULL, null=True, blank=True, related_name="complaints"
    )
    channel = models.CharField(max_length=20, blank=True)
    category = models.SlugField(max_length=80)
    summary = models.CharField(max_length=200)
    detail = models.TextField(blank=True)
    notification = models.ForeignKey(
        Notification, on_delete=models.SET_NULL, null=True, blank=True, related_name="complaints"
    )
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=OPEN)
    occurrences = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["status", "-updated_at"])]
