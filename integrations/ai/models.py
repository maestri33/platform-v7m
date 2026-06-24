"""Models do app integrations.ai — auditoria/custo de cada chamada de IA.

Tabela única ``ai_call``: 1 linha por TENTATIVA. Quando o service caminha a
cadeia de fallback, cada provedor que falha gera 1 linha ``status=error``; o
que dá certo gera 1 linha ``status=success``. Soma = telemetria de cobrança
e debugging.

Design (porte do ``backend-supletivo/integrations/ai/models.py``):
- ``provider`` é CharField LIVRE (sem choices): os providers vêm do .env
  (groq, deepseek, openai, minimax, …) e somar um novo é só config.
- ``cost`` fica NULL por enquanto: tabela de preços não existe, e a regra
  do dono é "não invento $$".
- Tabela interna, sem borda de API: não precisa de ``external_id`` UUID.
"""

from django.db import models


class AiCall(models.Model):
    """Registro de uma chamada a um provedor de IA: o quê, quem chamou, tokens, latência."""

    class Operation(models.TextChoices):
        TEXT = "text", "text"
        JSON = "json", "json"
        CHAT = "chat", "chat"
        SUMMARIZE = "summarize", "summarize"
        EXTRACT = "extract", "extract"
        GRADE = "grade", "grade"
        # mídia (single-provider na fase M1.7; TTS tem fallback, demais não)
        VISION = "vision", "vision"
        IMAGE = "image", "image"
        TTS = "tts", "tts"
        OCR = "ocr", "ocr"

    class Status(models.TextChoices):
        SUCCESS = "success", "success"
        ERROR = "error", "error"

    provider = models.CharField(max_length=20, db_index=True)
    operation = models.CharField(max_length=20, choices=Operation.choices)
    model = models.CharField(max_length=60)
    # Quem chamou (nome do app/feature consumidor, ex.: "apps.worship.services").
    caller = models.CharField(max_length=60, db_index=True)
    status = models.CharField(max_length=10, choices=Status.choices)

    prompt_tokens = models.IntegerField(null=True, blank=True)
    completion_tokens = models.IntegerField(null=True, blank=True)
    # Cache hit/miss — DeepSeek / MiniMax podem mandar essas métricas. Default 0.
    cache_hit_tokens = models.IntegerField(null=True, blank=True)
    cache_miss_tokens = models.IntegerField(null=True, blank=True)
    # Custo monetário da chamada. NULL até a tabela de preços ser definida.
    cost = models.DecimalField(max_digits=12, decimal_places=6, null=True, blank=True)
    latency_ms = models.IntegerField()

    finish_reason = models.CharField(max_length=40, blank=True, default="")
    error_code = models.CharField(max_length=40, blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    # Payload extra do caller (sem contrato fixo — caller decide o que mandar).
    extra = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "ai"
        db_table = "ai_call"
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["operation", "status"]),
            models.Index(fields=["provider", "model", "status"]),
        ]
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.provider}:{self.operation} {self.status} ({self.caller})"
