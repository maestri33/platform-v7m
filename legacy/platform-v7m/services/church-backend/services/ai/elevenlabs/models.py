import uuid
from django.db import models


class ElevenLabsTTSLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField(help_text="Texto enviado para conversão", blank=True, null=True)
    voice_id = models.CharField(max_length=200, blank=True, null=True)
    audio_path = models.CharField(max_length=500, blank=True, null=True)
    request_data = models.JSONField(help_text="Dados enviados na requisição", blank=True, null=True)
    response_data = models.JSONField(help_text="Dados de resposta da API ElevenLabs", blank=True, null=True)
    response_text = models.TextField(help_text="Texto da resposta ElevenLabs", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "elevenlabs"
        verbose_name = "Log ElevenLabs TTS"
        verbose_name_plural = "Logs ElevenLabs TTS"
        ordering = ["-created_at"]

    def __str__(self):
        return f"ElevenLabs TTS {self.id} em {self.created_at.strftime('%d/%m/%Y %H:%M')}"
