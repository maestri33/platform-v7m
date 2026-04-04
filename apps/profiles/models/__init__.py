"""Exporta os models do app profiles.

BaseModel foi centralizado neste arquivo para ficar disponivel como contrato
comum aos models do app, sem depender de um modulo separado.
"""

from django.db import models


class BaseModel(models.Model):
    """Modelo base com campos de auditoria de data/hora."""

    created_at = models.DateTimeField("criado em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        abstract = True


from .address import Address, AddressProof, StateChoices
from .phone import Phone
from .profile import EducationLevelChoices, GenderChoices, MaritalStatusChoices, Profile

__all__ = [
    "Address",
    "AddressProof",
    "BaseModel",
    "EducationLevelChoices",
    "GenderChoices",
    "MaritalStatusChoices",
    "Phone",
    "Profile",
    "StateChoices",
]
