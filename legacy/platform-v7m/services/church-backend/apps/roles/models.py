"""Papéis do domínio IEADPG: visitante, congregado e membro.

O catálogo de transições permitidas vive em ``settings.ROLE_RULES`` (lido por
``catalog.py``); aqui fica só a materialização no banco. Um perfil tem no
máximo um papel ativo — a constraint parcial garante isso — e as concessões
anteriores permanecem como histórico (``is_active=False``), porque promover
alguém a membro não deve apagar quando ele chegou como visitante.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.profiles.models import BaseModel, Profile


class Role(models.TextChoices):
    VISITANTE = "visitante", "Visitante"
    CONGREGADO = "congregado", "Congregado"
    MEMBRO = "membro", "Membro"


class ProfileRole(BaseModel):
    """Papel de um perfil, com histórico de concessões e revogações."""

    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="roles",
        verbose_name="perfil",
    )
    role = models.CharField("papel", max_length=16, choices=Role.choices)
    is_active = models.BooleanField("ativo", default=True)
    granted_at = models.DateTimeField("concedido em", default=timezone.now)
    revoked_at = models.DateTimeField("revogado em", null=True, blank=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="papeis_concedidos",
        verbose_name="concedido por",
    )
    # "captive_portal" · "captive_portal_merge" · "admin" · "backfill"
    source = models.CharField("origem", max_length=32, blank=True)

    class Meta:
        verbose_name = "papel do perfil"
        verbose_name_plural = "papéis dos perfis"
        ordering = ("-granted_at",)
        indexes = [models.Index(fields=["profile", "is_active"])]
        constraints = [
            models.UniqueConstraint(
                fields=["profile"],
                condition=models.Q(is_active=True),
                name="uniq_active_role_per_profile",
            )
        ]

    def __str__(self):
        return f"{self.profile} — {self.get_role_display()}"
