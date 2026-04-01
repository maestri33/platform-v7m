"""Models de documentos escolares."""

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


def school_certificate_upload_path(instance, filename):
    """Upload: media/apps/profiles/school-certificate/<profile-uuid>/arquivo."""
    profile_key = _profile_uuid_or_id(getattr(instance, "profile", None))
    return f"apps/profiles/school-certificate/{profile_key}/{_safe_name(filename)}"


def school_transcript_upload_path(instance, filename):
    """Upload: media/apps/profiles/school-transcript/<profile-uuid>/arquivo."""
    profile_key = _profile_uuid_or_id(getattr(instance, "profile", None))
    return f"apps/profiles/school-transcript/{profile_key}/{_safe_name(filename)}"


class SchoolCertificate(BaseModel):
    """Certificado ou diploma escolar (PDF)."""

    profile = models.OneToOneField(
        "profiles.Profile",
        on_delete=models.CASCADE,
        related_name="school_certificate",
        verbose_name="perfil",
    )
    file = models.FileField(
        "arquivo",
        upload_to=school_certificate_upload_path,
        help_text="Preferencialmente PDF.",
    )

    class Meta:
        verbose_name = "certificado escolar"
        verbose_name_plural = "certificados escolares"

    def __str__(self):
        return f"Certificado - {self.profile}"


class SchoolTranscript(BaseModel):
    """Histórico escolar (PDF)."""

    profile = models.OneToOneField(
        "profiles.Profile",
        on_delete=models.CASCADE,
        related_name="school_transcript",
        verbose_name="perfil",
    )
    file = models.FileField(
        "arquivo",
        upload_to=school_transcript_upload_path,
        help_text="Preferencialmente PDF.",
    )

    class Meta:
        verbose_name = "histórico escolar"
        verbose_name_plural = "históricos escolares"

    def __str__(self):
        return f"Histórico - {self.profile}"
