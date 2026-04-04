"""Modelo principal de perfil de usuário."""

import uuid

from django.conf import settings
from django.db import models

from . import BaseModel
from .address import Address


class GenderChoices(models.TextChoices):
    """Sexo/gênero para cadastro básico."""

    FEMALE = "female", "Feminino"
    MALE = "male", "Masculino"


class EducationLevelChoices(models.TextChoices):
    """Nível de escolaridade."""

    INCOMPLETE_ELEMENTARY = "incomplete_elementary", "Fundamental incompleto"
    COMPLETE_ELEMENTARY = "complete_elementary", "Fundamental completo"
    INCOMPLETE_HIGH_SCHOOL = "incomplete_high_school", "Médio incompleto"
    COMPLETE_HIGH_SCHOOL = "complete_high_school", "Médio completo"
    INCOMPLETE_COLLEGE = "incomplete_college", "Superior incompleto"
    COMPLETE_COLLEGE = "complete_college", "Superior completo"
    POSTGRADUATE = "postgraduate", "Pós-graduação"
    MASTER = "master", "Mestrado"
    DOCTORATE = "doctorate", "Doutorado"
    NOT_INFORMED = "not_informed", "Não informado"


class MaritalStatusChoices(models.TextChoices):
    """Estado civil."""

    SINGLE = "single", "Solteiro(a)"
    MARRIED = "married", "Casado(a)"
    DIVORCED = "divorced", "Divorciado(a)"
    WIDOWED = "widowed", "Viúvo(a)"
    STABLE_UNION = "stable_union", "União estável"
    NOT_INFORMED = "not_informed", "Não informado"


class Profile(BaseModel):
    """Perfil do usuário com dados pessoais."""

    uuid = models.UUIDField(
        "identificador",
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name="usuário",
    )
    address = models.OneToOneField(
        Address,
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name="endereço",
    )
    full_name = models.CharField(
        "nome completo",
        max_length=255,
        blank=True,
        default="",
        help_text="Quando informado, sincroniza nome e sobrenome no usuário relacionado.",
    )
    date_of_birth = models.DateField(
        "data de nascimento",
        blank=True,
        null=True,
    )
    marital_status = models.CharField(
        "estado civil",
        max_length=20,
        choices=MaritalStatusChoices,
        blank=True,
        default="",
    )
    education_level = models.CharField(
        "nível de escolaridade",
        max_length=30,
        choices=EducationLevelChoices,
        blank=True,
        default="",
    )
    mother_name = models.CharField(
        "nome da mãe",
        max_length=255,
        blank=True,
        default="",
    )
    gender = models.CharField(
        "sexo/gênero",
        max_length=20,
        choices=GenderChoices,
        blank=True,
        default="",
    )

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfis"
        ordering = ["user__first_name", "user__last_name"]
        indexes = [
            models.Index(fields=["gender"], name="profiles_profile_gender_idx"),
            models.Index(fields=["marital_status"], name="profiles_profile_marital_idx"),
        ]

    def save(self, *args, **kwargs):
        """Garante um Address próprio para cada Profile antes de salvar."""

        if self.address_id is None:
            self.address = Address.objects.create(
                street="",
                number="",
                neighborhood="",
                city="",
                state="",
            )
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Perfil de {self.user.get_full_name() or self.user.username}"
