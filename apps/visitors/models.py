"""Modelos iniciais do domínio de visitantes."""

from django.db import models

from apps.profiles.models import BaseModel, Profile


class VisitorStatus(models.IntegerChoices):
    """Status inicial e futuras etapas do visitante."""

    NEW_ONLINE = 1, "Cadastro online realizado"
    DATA_COMPLETED_ONLINE = 2, "Dados iniciais salvos - online"
    ADDRESS_COMPLETED_ONLINE = 3, "Endereço salvo - online"
    DATA_RELIGION_COMPLETED_ONLINE = 4, "Dados religiosos salvos - online"
    AWAITTING_PRESENTIAL_VISIT = 5, "Aguardando visita presencial"

    NEW_PRESENCIAL = 11, "Visitante presencial registrado"
    DATA_COMPLETED_PRESENCIAL = 12, "Dados iniciais salvos - presencial"
    ADDRESS_COMPLETED_PRESENCIAL = 13, "Endereço salvo - presencial"
    DATA_RELIGION_COMPLETED_PRESENCIAL = 14, "Dados religiosos salvos - presencial"
    AWAITING_TO_COLLECT_YOUR_GIFT = 15, "Aguardando coleta do presente de boas-vindas"

    AWAITING_TO_BE_CONTACTED = 21, "Aguardando contato da equipe de recepção"


    @classmethod
    def details_for(cls, value):
        """Retorna metadados explicativos para o status informado."""

        details = {
            cls.NEW_ONLINE: {
                "code": int(cls.NEW_ONLINE),
                "label": cls.NEW_ONLINE.label,
                "description": "Contato captado pela internet com intenção de visitar a igreja.",
                "required_action": "Completar os dados principais do cadastro.",
            },
            cls.DATA_COMPLETED_ONLINE: {
                "code": int(cls.DATA_COMPLETED_ONLINE),
                "label": cls.DATA_COMPLETED_ONLINE.label,
                "description": "Dados pessoais principais já foram preenchidos no fluxo online.",
                "required_action": "Completar o endereço.",
            },
            cls.ADDRESS_COMPLETED_ONLINE: {
                "code": int(cls.ADDRESS_COMPLETED_ONLINE),
                "label": cls.ADDRESS_COMPLETED_ONLINE.label,
                "description": "O endereço do visitante já foi preenchido no fluxo online.",
                "required_action": "Informar os dados religiosos.",
            },
            cls.DATA_RELIGION_COMPLETED_ONLINE: {
                "code": int(cls.DATA_RELIGION_COMPLETED_ONLINE),
                "label": cls.DATA_RELIGION_COMPLETED_ONLINE.label,
                "description": "Os dados religiosos já foram preenchidos no fluxo online.",
                "required_action": "Concluir a jornada até a visita presencial.",
            },
            cls.AWAITTING_PRESENTIAL_VISIT: {
                "code": int(cls.AWAITTING_PRESENTIAL_VISIT),
                "label": cls.AWAITTING_PRESENTIAL_VISIT.label,
                "description": "Cadastro online concluído; falta registrar a visita presencial.",
                "required_action": "Registrar a visita presencial na igreja.",
            },
            cls.NEW_PRESENCIAL: {
                "code": int(cls.NEW_PRESENCIAL),
                "label": cls.NEW_PRESENCIAL.label,
                "description": "Visitante presencial registrado.",
                "required_action": "Completar os dados principais do cadastro.",
            },
            cls.DATA_COMPLETED_PRESENCIAL: {
                "code": int(cls.DATA_COMPLETED_PRESENCIAL),
                "label": cls.DATA_COMPLETED_PRESENCIAL.label,
                "description": "Dados pessoais principais já foram preenchidos no fluxo presencial.",
                "required_action": "Completar o endereço.",
            },
            cls.ADDRESS_COMPLETED_PRESENCIAL: {
                "code": int(cls.ADDRESS_COMPLETED_PRESENCIAL),
                "label": cls.ADDRESS_COMPLETED_PRESENCIAL.label,
                "description": "O endereço do visitante já foi preenchido no fluxo presencial.",
                "required_action": "Informar os dados religiosos.",
            },
            cls.DATA_RELIGION_COMPLETED_PRESENCIAL: {
                "code": int(cls.DATA_RELIGION_COMPLETED_PRESENCIAL),
                "label": cls.DATA_RELIGION_COMPLETED_PRESENCIAL.label,
                "description": "Os dados religiosos já foram preenchidos no fluxo presencial.",
                "required_action": "Encaminhar para o presente de boas-vindas.",
            },
            cls.AWAITING_TO_COLLECT_YOUR_GIFT: {
                "code": int(cls.AWAITING_TO_COLLECT_YOUR_GIFT),
                "label": cls.AWAITING_TO_COLLECT_YOUR_GIFT.label,
                "description": "Visitante presencial com cadastro completo aguardando o presente de boas-vindas.",
                "required_action": "Entregar o presente de boas-vindas.",
            },
            cls.AWAITING_TO_BE_CONTACTED: {
                "code": int(cls.AWAITING_TO_BE_CONTACTED),
                "label": cls.AWAITING_TO_BE_CONTACTED.label,
                "description": "O visitante aguarda contato da equipe de recepção.",
                "required_action": "Entrar em contato com o visitante.",
            },
        }
        return details.get(int(value), {})


class ReligionChoices(models.TextChoices):
    """Religião declarada pelo visitante."""

    CHRISTIANITY = "christianity", "Cristianismo"
    SPIRITISM = "spiritism", "Espiritismo"
    UMBANDA_CANDOMBLE = "umbanda_candomble", "Umbanda/Candomblé"
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
