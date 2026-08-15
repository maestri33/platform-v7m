import uuid
from django.db import models


class GeminiImageLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prompt_text = models.TextField(help_text="Texto do prompt enviado ao Gemini", blank=True, null=True)
    image_path = models.CharField(max_length=500, help_text="Caminho local da imagem gerada/alterada", blank=True, null=True)
    request_data = models.JSONField(help_text="Dados enviados na requisição", blank=True, null=True)
    response_data = models.JSONField(help_text="Dados de resposta da API Gemini", blank=True, null=True)
    response_text = models.TextField(help_text="Texto da resposta Gemini", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "gemini"
        verbose_name = "Log Gemini Image"
        verbose_name_plural = "Logs Gemini Image"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Gemini Image {self.id} em {self.created_at.strftime('%d/%m/%Y %H:%M')}"
