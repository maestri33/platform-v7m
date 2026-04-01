"""Modelo de notificação com suporte a templates e múltiplos tipos de conteúdo."""

from django.db import models

from apps.profiles.models import Profile


class Notification(models.Model):
    """Notificação unificada com suporte a templates, múltiplos tipos de conteúdo e TTS."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        PROCESSING = "processing", "Processando"
        SENT = "sent", "Enviado"
        FAILED = "failed", "Falhou"

    class Channel(models.TextChoices):
        WHATSAPP = "whatsapp", "WhatsApp"
        EMAIL = "email", "E-mail"
        BOTH = "both", "Ambos"

    class MediaType(models.TextChoices):
        TEXT = "text", "Texto"
        IMAGE = "image", "Imagem"
        VIDEO = "video", "Vídeo"
        AUDIO = "audio", "Áudio"
        DOCUMENT = "document", "Documento"

    recipient = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="destinatário",
    )
    title = models.CharField("título", max_length=200)
    content = models.TextField("conteúdo", help_text="Título e texto sempre em Markdown.")
    template_name = models.CharField(
        "nome do template",
        max_length=100,
        blank=True,
        help_text="Template HTML do e-mail. Padrão: email_notification.html",
    )

    use_tts = models.BooleanField(
        "usar TTS",
        default=False,
        help_text="Quando ativo, o WhatsApp envia áudio gerado pelo ElevenLabs.",
    )
    is_media = models.BooleanField(
        "tem mídia",
        default=False,
        help_text="Indica se há payload de mídia associado à notificação.",
    )
    media_type = models.CharField(
        "tipo de mídia",
        max_length=20,
        choices=MediaType,
        default=MediaType.TEXT,
    )
    media_payload = models.TextField(
        "payload da mídia",
        blank=True,
        default="",
        help_text="Base64 puro, data URL ou URL pública da mídia.",
    )
    media_filename = models.CharField(
        "nome do arquivo da mídia",
        max_length=255,
        blank=True,
        default="",
    )
    media_mime_type = models.CharField(
        "mime type da mídia",
        max_length=100,
        blank=True,
        default="",
    )

    status = models.CharField("status", max_length=20, choices=Status, default=Status.PENDING)
    channel_sent = models.CharField("canal enviado", max_length=20, choices=Channel, blank=True)
    scheduled_for = models.DateTimeField("agendado para", null=True, blank=True)
    processed_at = models.DateTimeField("processado em", null=True, blank=True)
    attempts = models.PositiveSmallIntegerField("tentativas", default=0)
    event_key = models.CharField("chave do evento", max_length=120, blank=True, default="")
    last_error_message = models.TextField("último erro", blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "notificação"
        verbose_name_plural = "notificações"

    def __str__(self):
        return f"{self.title} → {self.recipient}"

    @property
    def has_media_payload(self):
        return bool(str(self.resolved_media_payload).strip())

    @property
    def resolved_media_payload(self):
        if str(self.media_payload or "").strip():
            return self.media_payload
        if self.is_media and self.media_type != self.MediaType.TEXT:
            return self.content
        return ""

    @property
    def is_tts(self):
        return self.use_tts

    @is_tts.setter
    def is_tts(self, value):
        self.use_tts = value


class NotificationLog(models.Model):
    """Log de entrega da notificação."""

    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name="logs",
        verbose_name="notificação",
    )
    channel = models.CharField("canal", max_length=20, choices=Notification.Channel)
    success = models.BooleanField("sucesso", default=False)
    response_data = models.JSONField("resposta da API", default=dict, blank=True)
    error_message = models.TextField("mensagem de erro", blank=True)
    provider_message_id = models.CharField("id da mensagem no provedor", max_length=120, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.channel} - {'✓' if self.success else '✗'}"
