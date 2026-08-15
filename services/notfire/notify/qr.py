"""Geração local e determinística de QR Codes usados nas notificações."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
import tempfile
from urllib.parse import quote

from django.conf import settings


MAX_QR_DATA_LENGTH = 4096


def build_qr_media_url(external_id: object, data: str) -> str:
    """Gera um PNG em ``MEDIA_ROOT/qr`` e devolve sua URL acessível.

    O nome determinístico evita acumular um arquivo novo a cada retry da fila.
    """

    value = (data or "").strip()
    if not value:
        raise ValueError("conteúdo do QR Code é obrigatório")
    if len(value) > MAX_QR_DATA_LENGTH:
        raise ValueError(f"conteúdo do QR Code excede {MAX_QR_DATA_LENGTH} caracteres")

    base = str(
        getattr(settings, "EXTERNAL_URL", "")
        or getattr(settings, "MEDIA_LAN_BASE", "")
        or ""
    ).rstrip("/")
    if not base:
        raise ValueError("EXTERNAL_URL ou MEDIA_LAN_BASE precisa estar configurada para enviar QR Code")

    media_root = Path(str(settings.MEDIA_ROOT))
    qr_dir = media_root / "qr"
    qr_dir.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]
    safe_id = "".join(char for char in str(external_id) if char.isalnum() or char in "-_")
    filename = f"{safe_id or 'notification'}-{digest}.png"
    target = qr_dir / filename

    if not target.exists():
        import qrcode

        image = qrcode.make(value)
        with tempfile.NamedTemporaryFile(
            suffix=".png", prefix=".qr-", dir=qr_dir, delete=False
        ) as temporary:
            temp_name = temporary.name
        try:
            image.save(temp_name, format="PNG")
            os.replace(temp_name, target)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)

    media_url = str(getattr(settings, "MEDIA_URL", "/media/") or "/media/")
    return f"{base}/{media_url.strip('/')}/qr/{quote(filename)}"
