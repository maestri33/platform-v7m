"""Model de documento pessoal (CNH ou RG)."""

from pathlib import Path

from django.db import models

from . import BaseModel
from .profile import Profile


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


def personal_document_upload_path(instance, filename):
    """Upload: media/apps/profiles/personal-document/<profile-uuid>/<tipo>/arquivo."""
    profile_key = _profile_uuid_or_id(getattr(instance, "profile", None))
    doc_type = getattr(instance, "document_type", "document")
    return f"apps/profiles/personal-document/{profile_key}/{doc_type}/{_safe_name(filename)}"


class PersonalDocumentTypeChoices(models.TextChoices):
    """Tipo de documento pessoal permitido."""

    CNH = "cnh", "CNH"
    RG = "rg", "RG"


class PersonalDocument(BaseModel):
    """Documento pessoal vinculado ao perfil."""

    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="personal_documents",
        verbose_name="perfil",
    )
    document_type = models.CharField(
        "tipo de documento",
        max_length=10,
        choices=PersonalDocumentTypeChoices,
    )
    number = models.CharField("numero", max_length=40, blank=True, default="")
    file = models.FileField(
        "arquivo",
        upload_to=personal_document_upload_path,
        help_text="Arquivo do documento (imagem ou PDF).",
    )

    class Meta:
        verbose_name = "documento pessoal"
        verbose_name_plural = "documentos pessoais"
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "document_type"],
                name="unique_personal_document_per_type",
            )
        ]
        ordering = ["document_type", "-created_at"]

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.profile}"
