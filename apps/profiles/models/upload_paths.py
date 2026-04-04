"""Compatibilidade para migrations antigas de profiles."""

from pathlib import Path

from .address import address_proof_upload_path


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
    """Mantido para compatibilidade de migrations antigas."""

    profile_key = _profile_uuid_or_id(getattr(instance, "profile", None))
    doc_type = getattr(instance, "document_type", "document")
    return f"apps/profiles/personal-document/{profile_key}/{doc_type}/{_safe_name(filename)}"


def school_certificate_upload_path(instance, filename):
    """Mantido para compatibilidade de migrations antigas."""

    profile_key = _profile_uuid_or_id(getattr(instance, "profile", None))
    return f"apps/profiles/school-certificate/{profile_key}/{_safe_name(filename)}"


def school_transcript_upload_path(instance, filename):
    """Mantido para compatibilidade de migrations antigas."""

    profile_key = _profile_uuid_or_id(getattr(instance, "profile", None))
    return f"apps/profiles/school-transcript/{profile_key}/{_safe_name(filename)}"

__all__ = [
    "address_proof_upload_path",
    "personal_document_upload_path",
    "school_certificate_upload_path",
    "school_transcript_upload_path",
]
