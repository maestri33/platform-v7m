"""Model de telefone vinculado ao perfil."""

from django.db import models

from . import BaseModel
from .profile import Profile


class Phone(BaseModel):
    """Telefone de contato vinculado ao perfil."""

    profile = models.OneToOneField(
        Profile,
        on_delete=models.CASCADE,
        related_name="phone",
        verbose_name="perfil",
    )
    number = models.CharField(
        "número",
        max_length=20,
        help_text="Formato: (00) 00000-0000",
    )

    class Meta:
        verbose_name = "telefone"
        verbose_name_plural = "telefones"

    def __str__(self):
        return f"{self.number} - {self.profile}"
