"""Modelos iniciais do domínio de visitantes."""

import logging
import uuid

from django.db import models

from apps.profiles.models import BaseModel, Profile

logger = logging.getLogger(__name__)


class VisitorStatus(models.IntegerChoices):
    """Status inicial e futuras etapas do visitante."""

    NEW_ONLINE = 1, "Cadastro online realizado"
    DATA_COMPLETED_ONLINE = 2, "Dados iniciais salvos - online"
    ADDRESS_COMPLETED_ONLINE = 3, "Endereço salvo - online"
    AWAITTING_PRESENTIAL_VISIT = 4, "Aguardando visita presencial"

    NEW_PRESENCIAL = 11, "Visitante presencial registrado"
    DATA_COMPLETED_PRESENCIAL = 12, "Dados iniciais salvos - presencial"
    ADDRESS_COMPLETED_PRESENCIAL = 13, "Endereço salvo - presencial"
    AWAITING_TO_COLLECT_YOUR_GIFT = 14, "Aguardando coleta do presente de boas-vindas"
    AWAITING_RECEPTION_CONTACT = 21, "Aguardando contato da equipe de recepção"


    @classmethod
    def details_for(cls, value):
        """Retorna metadados explicativos para o status informado."""

        value = int(value)
        legacy_aliases = {
            5: int(cls.AWAITTING_PRESENTIAL_VISIT),
            15: int(cls.AWAITING_TO_COLLECT_YOUR_GIFT),
        }
        value = legacy_aliases.get(value, value)

        details = {
            int(cls.NEW_ONLINE): {
                "code": int(cls.NEW_ONLINE),
                "label": cls.NEW_ONLINE.label,
                "description": "Contato captado pela internet com intenção de visitar a igreja.",
                "required_action": "Completar os dados principais do cadastro.",
            },
            int(cls.DATA_COMPLETED_ONLINE): {
                "code": int(cls.DATA_COMPLETED_ONLINE),
                "label": cls.DATA_COMPLETED_ONLINE.label,
                "description": "Dados pessoais principais já foram preenchidos no fluxo online.",
                "required_action": "Completar o endereço.",
            },
            int(cls.ADDRESS_COMPLETED_ONLINE): {
                "code": int(cls.ADDRESS_COMPLETED_ONLINE),
                "label": cls.ADDRESS_COMPLETED_ONLINE.label,
                "description": "O endereço do visitante já foi preenchido no fluxo online.",
                "required_action": "Informar os dados religiosos.",
            },
            int(cls.AWAITTING_PRESENTIAL_VISIT): {
                "code": int(cls.AWAITTING_PRESENTIAL_VISIT),
                "label": cls.AWAITTING_PRESENTIAL_VISIT.label,
                "description": "Cadastro online concluído; falta registrar a visita presencial.",
                "required_action": "Vir participar de um culto.",
            },
            int(cls.NEW_PRESENCIAL): {
                "code": int(cls.NEW_PRESENCIAL),
                "label": cls.NEW_PRESENCIAL.label,
                "description": "Visitante presencial registrado.",
                "required_action": "Completar os dados principais do cadastro.",
            },
            int(cls.DATA_COMPLETED_PRESENCIAL): {
                "code": int(cls.DATA_COMPLETED_PRESENCIAL),
                "label": cls.DATA_COMPLETED_PRESENCIAL.label,
                "description": "Dados pessoais principais já foram preenchidos no fluxo presencial.",
                "required_action": "Completar o endereço.",
            },
            int(cls.ADDRESS_COMPLETED_PRESENCIAL): {
                "code": int(cls.ADDRESS_COMPLETED_PRESENCIAL),
                "label": cls.ADDRESS_COMPLETED_PRESENCIAL.label,
                "description": "O endereço do visitante já foi preenchido no fluxo presencial.",
                "required_action": "Informar os dados religiosos.",
            },
            int(cls.AWAITING_TO_COLLECT_YOUR_GIFT): {
                "code": int(cls.AWAITING_TO_COLLECT_YOUR_GIFT),
                "label": cls.AWAITING_TO_COLLECT_YOUR_GIFT.label,
                "description": "Visitante presencial com cadastro completo aguardando o presente de boas-vindas.",
                "required_action": "Entregar o presente de boas-vindas.",
            },
            int(cls.AWAITING_RECEPTION_CONTACT): {
                "code": int(cls.AWAITING_RECEPTION_CONTACT),
                "label": cls.AWAITING_RECEPTION_CONTACT.label,
                "description": "Visitante já compareceu à igreja, retirou o brinde e aguarda ser abordado.",
                "required_action": "Aguardar abordagem da equipe de recepção.",
            },
        }
        return details.get(value, {})


class ReligionChoices(models.TextChoices):
    """Religião declarada pelo visitante."""

    CHRISTIANITY = "christianity", "Cristianismo"
    SPIRITISM = "spiritism", "Espiritismo"
    AFRICAN_ORIGIN = "african_origin", "Religião de matriz Africana - Umbanda/Candomblé"
    ISLAM = "islam", "Islamismo"
    JUDAISM = "judaism", "Judaísmo"
    BUDDHISM = "buddhism", "Budismo"
    NO_RELIGION = "no_religion", "Sem religião"
    OTHER = "other", "Outra"


class ChristianityTypeChoices(models.TextChoices):
    """Ramos do cristianismo que queremos capturar."""

    EVANGELICAL_PROTESTANT = "evangelical_protestant", "Evangélica/Protestante"
    ROMAN_CATHOLIC = "roman_catholic", "Católico Romano"
    ORTHODOX_CATHOLIC = "orthodox_catholic", "Católico Ortodoxo"
    OTHER = "other", "Outro"


class Visitor(BaseModel):
    """Representa a pessoa em contexto de visitante da igreja."""

    profile = models.OneToOneField(
        Profile,
        on_delete=models.CASCADE,
        related_name="visitor",
        verbose_name="perfil",
    )
    
    status = models.PositiveSmallIntegerField(
        "status",
        choices=VisitorStatus,
        default=VisitorStatus.NEW_ONLINE,
    )
    date_of_visit = models.DateField(
        "data da visita",
        blank=True,
        null=True,
    )
    religion = models.CharField(
        "religião",
        max_length=40,
        choices=ReligionChoices,
        blank=True,
        default="",
    )
    christianity_type = models.CharField(
        "ramo do cristianismo",
        max_length=40,
        choices=ChristianityTypeChoices,
        blank=True,
        default="",
    )

    class Meta:
        verbose_name = "visitante"
        verbose_name_plural = "visitantes"

    def __str__(self):
        return f"Visitante - {self.profile}"


class EvangelicalChurchInfo(BaseModel):
    """Informações complementares quando o visitante é evangélico/protestante."""

    visitor = models.OneToOneField(
        Visitor,
        on_delete=models.CASCADE,
        related_name="evangelical_church_info",
        verbose_name="visitante",
    )
    church_name = models.CharField(
        "igreja",
        max_length=255,
        blank=True,
        default="",
    )
    is_in_communion = models.BooleanField(
        "está em comunhão",
        blank=True,
        null=True,
    )

    class Meta:
        verbose_name = "informação de igreja evangélica"
        verbose_name_plural = "informações de igreja evangélica"

    def __str__(self):
        return f"Igreja evangélica de {self.visitor.profile}"


class VisitorApiLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operation = models.CharField(max_length=120, help_text="Operacao executada no endpoint", blank=True, null=True)
    request_method = models.CharField(max_length=10, help_text="Metodo HTTP da requisicao", blank=True, null=True)
    path = models.CharField(max_length=255, help_text="Caminho da rota acessada", blank=True, null=True)
    authenticated_user_id = models.PositiveIntegerField(help_text="Usuario autenticado vinculado ao request", blank=True, null=True)
    authenticated_profile_uuid = models.CharField(max_length=36, help_text="Profile UUID autenticado no request", blank=True, null=True)
    success = models.BooleanField(default=False)
    status_code = models.PositiveIntegerField(help_text="Status HTTP retornado", blank=True, null=True)
    duration_ms = models.PositiveIntegerField(help_text="Duracao do request em milissegundos", blank=True, null=True)
    request_data = models.JSONField(help_text="Dados recebidos no endpoint", blank=True, null=True)
    response_data = models.JSONField(help_text="Dados retornados pelo endpoint", blank=True, null=True)
    response_text = models.TextField(help_text="Resumo textual da resposta", blank=True, null=True)
    error_message = models.TextField(help_text="Erro capturado na execucao", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "log da API de visitantes"
        verbose_name_plural = "logs da API de visitantes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Visitors API {self.operation or 'request'} em {self.created_at.strftime('%d/%m/%Y %H:%M')}"


def create_visitor_api_log(**kwargs):
    """Persiste logs de API sem quebrar o fluxo principal."""

    try:
        log = VisitorApiLog.objects.create(**kwargs)
        return str(log.id)
    except Exception as exc:
        logger.exception("Falha ao persistir log da API de visitantes: %s", exc)
        return ""
