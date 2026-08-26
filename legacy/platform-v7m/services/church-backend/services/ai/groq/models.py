import uuid
from django.db import models

class GroqVisionLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_path = models.CharField(max_length=500, help_text="Caminho local da imagem analisada")
    prompt_text = models.TextField(help_text="Texto do prompt enviado à API")
    response_text = models.TextField(help_text="Resposta em texto retornada pela API", blank=True, null=True)
    request_data = models.JSONField(help_text="Dados enviados na requisição", blank=True, null=True)
    response_data = models.JSONField(help_text="Resposta completa da API em JSON", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = "groq"
        verbose_name = "Log Visão Groq"
        verbose_name_plural = "Logs Visão Groq"
        ordering = ["-created_at"]
        
    def __str__(self):
        return f"Groq Vision {self.id} em {self.created_at.strftime('%d/%m/%Y %H:%M')}"
