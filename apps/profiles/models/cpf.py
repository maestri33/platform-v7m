"""Model de CPF vinculado ao perfil."""

from django.db import models

from . import BaseModel
from .profile import Profile


class CPF(BaseModel):
    """Cadastro de Pessoa Física vinculado ao perfil."""

    profile = models.OneToOneField(
        Profile,
        on_delete=models.CASCADE,
        related_name="cpf",
        verbose_name="perfil",
    )
    number = models.CharField(
        "número do CPF",
        max_length=14,
        unique=True,
        help_text="Formato: 000.000.000-00",
    )

    class Meta:
        verbose_name = "cpf"
        verbose_name_plural = "cpfs"

    def __str__(self):
        return self.number
