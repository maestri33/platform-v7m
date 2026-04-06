import logging
import uuid

from django.db import models

logger = logging.getLogger(__name__)


class EvolutionApiLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operation = models.CharField(max_length=120, help_text="Operacao executada na integracao", blank=True, null=True)
    request_method = models.CharField(max_length=10, help_text="Metodo HTTP da chamada", blank=True, null=True)
    endpoint = models.CharField(max_length=500, help_text="Endpoint ou URL acessada", blank=True, null=True)
    instance = models.CharField(max_length=120, help_text="Instancia Evolution utilizada", blank=True, null=True)
    target_number = models.CharField(max_length=40, help_text="Numero principal do fluxo", blank=True, null=True)
    success = models.BooleanField(default=False)
    status_code = models.PositiveIntegerField(help_text="Status HTTP retornado", blank=True, null=True)
    duration_ms = models.PositiveIntegerField(help_text="Duracao da operacao em milissegundos", blank=True, null=True)
    request_data = models.JSONField(help_text="Dados enviados na requisicao", blank=True, null=True)
    response_data = models.JSONField(help_text="Dados recebidos na resposta", blank=True, null=True)
    response_text = models.TextField(help_text="Resposta textual ou resumo do retorno", blank=True, null=True)
    error_message = models.TextField(help_text="Mensagem de erro capturada", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "evolution"
        verbose_name = "Log Evolution API"
        verbose_name_plural = "Logs Evolution API"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Evolution {self.operation or 'request'} em {self.created_at.strftime('%d/%m/%Y %H:%M')}"


def create_evolution_api_log(**kwargs):
    """Persiste log sem quebrar o fluxo principal da integracao."""

    try:
        log = EvolutionApiLog.objects.create(**kwargs)
        return str(log.id)
    except Exception as exc:
        logger.exception("Falha ao persistir log da Evolution API: %s", exc)
        return ""
