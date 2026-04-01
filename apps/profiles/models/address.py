"""Modelos de endereço e comprovante de endereço."""

from pathlib import Path

from django.db import models

from . import BaseModel


def _profile_uuid_or_id(profile):
    """Retorna o UUID do perfil quando existir; caso contrário, usa o id."""
    if profile is None:
        return "sem-profile"
    if getattr(profile, "uuid", None):
        return str(profile.uuid)
    if getattr(profile, "pk", None):
        return str(profile.pk)
    return "sem-profile"


def _safe_name(filename):
    """Mantém um nome simples para evitar problemas de path."""
    return Path(filename).name


def address_proof_upload_path(instance, filename):
    """Define o caminho de upload do comprovante de endereço."""
    profile_key = _profile_uuid_or_id(getattr(instance, "profile", None))
    return f"apps/profiles/address/{profile_key}/{_safe_name(filename)}"


class StateChoices(models.TextChoices):
    """Unidades federativas do Brasil."""

    AC = "AC", "Acre"
    AL = "AL", "Alagoas"
    AP = "AP", "Amapá"
    AM = "AM", "Amazonas"
    BA = "BA", "Bahia"
    CE = "CE", "Ceará"
    DF = "DF", "Distrito Federal"
    ES = "ES", "Espírito Santo"
    GO = "GO", "Goiás"
    MA = "MA", "Maranhão"
    MT = "MT", "Mato Grosso"
    MS = "MS", "Mato Grosso do Sul"
    MG = "MG", "Minas Gerais"
    PA = "PA", "Pará"
    PB = "PB", "Paraíba"
    PR = "PR", "Paraná"
    PE = "PE", "Pernambuco"
    PI = "PI", "Piauí"
    RJ = "RJ", "Rio de Janeiro"
    RN = "RN", "Rio Grande do Norte"
    RS = "RS", "Rio Grande do Sul"
    RO = "RO", "Rondônia"
    RR = "RR", "Roraima"
    SC = "SC", "Santa Catarina"
    SP = "SP", "São Paulo"
    SE = "SE", "Sergipe"
    TO = "TO", "Tocantins"


class Address(BaseModel):
    """Endereço genérico que pode ser compartilhado entre entidades."""

    zipcode = models.CharField(
        "CEP",
        max_length=9,
        blank=True,
        default="",
        help_text="Formato esperado: 00000-000",
    )
    street = models.CharField("endereço", max_length=255)
    number = models.CharField("número", max_length=20)
    complement = models.CharField("complemento", max_length=255, blank=True, default="")
    neighborhood = models.CharField("bairro", max_length=120)
    city = models.CharField("cidade", max_length=120)
    state = models.CharField("estado", max_length=2, choices=StateChoices, db_index=True)
    country = models.CharField("país", max_length=80, default="Brasil")

    class Meta:
        verbose_name = "endereço"
        verbose_name_plural = "endereços"
        ordering = ["state", "city", "street", "number"]
        indexes = [
            models.Index(fields=["state", "city"], name="profiles_addr_state_city_idx"),
        ]

    def __str__(self):
        return f"{self.street}, {self.number} - {self.city}/{self.state}"


class AddressProof(BaseModel):
    """Comprovante de endereço em imagem ou PDF."""

    profile = models.ForeignKey(
        "profiles.Profile",
        on_delete=models.CASCADE,
        related_name="address_proofs",
        verbose_name="perfil",
    )
    file = models.FileField(
        "arquivo",
        upload_to=address_proof_upload_path,
        help_text="Aceita imagem ou PDF.",
    )
    description = models.CharField("descrição", max_length=255, blank=True, default="")

    class Meta:
        verbose_name = "comprovante de endereço"
        verbose_name_plural = "comprovantes de endereço"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comprovante de endereço - {self.profile}"
