"""Compatibilidade para migrations antigas de profiles.

As funcoes principais foram movidas para os arquivos dos models.
Este modulo permanece apenas para manter imports historicos das migrations.
"""

from .address import address_proof_upload_path
from .personal_document import personal_document_upload_path
from .school import school_certificate_upload_path, school_transcript_upload_path

__all__ = [
    "address_proof_upload_path",
    "personal_document_upload_path",
    "school_certificate_upload_path",
    "school_transcript_upload_path",
]
