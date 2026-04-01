"""Ferramenta para buscar URL da foto de perfil.

Salva a imagem local em media/whatsapp/profile/<uuid>.<ext> quando a busca for bem-sucedida.
"""

import mimetypes
import uuid
from pathlib import Path

import requests
from django.conf import settings

from services.communication.evolution.requests import EvolutionRequestClient


def get_picture_profile(*, number):
    """Retorna URL de avatar/perfil do numero informado.

    Se o endpoint retornar URL da foto, a função faz download do binário e salva
    como arquivo local em MEDIA_ROOT/whatsapp/profile/<uuid>.<ext>.

    Retorna dicionário com a resposta original e campos adicionais:
    - profile_picture_url
    - saved_image_path (relativo a MEDIA_ROOT)
    - saved_image_url (pública)
    """
    if not number:
        raise ValueError("number is required")

    client = EvolutionRequestClient()
    payload = {"number": client.normalize_number(number)}
    result = client.post(f"/chat/fetchProfilePictureUrl/{client.instance}", payload)

    # Poder vir no formato antigo com chave de sucesso ou diretamente com fields base.
    if result.get("success") and isinstance(result.get("data"), dict):
        data = result["data"]
    elif isinstance(result, dict):
        data = result
    else:
        data = {}

    profile_url = data.get("profilePictureUrl") or data.get("profile_picture_url") or data.get("url")

    if profile_url:
        resp = requests.get(profile_url, timeout=30)
        if resp.status_code == 200 and resp.content:
            content_type = resp.headers.get("Content-Type", "")
            ext = mimetypes.guess_extension(content_type.split(";")[0].strip() if ";" in content_type else content_type) or ".jpg"
            ext = ext if ext.startswith(".") else f".{ext}"

            save_dir = Path(settings.MEDIA_ROOT) / "whatsapp" / "profile"
            save_dir.mkdir(parents=True, exist_ok=True)

            filename = f"{uuid.uuid4()}{ext}"
            abs_path = save_dir / filename
            rel_path = f"whatsapp/profile/{filename}"

            with open(abs_path, "wb") as f:
                f.write(resp.content)

            result["saved_image_path"] = rel_path
            result["saved_image_url"] = f"{settings.APP_BASE_URL}{settings.MEDIA_URL}{rel_path}"
            result["profile_picture_url"] = profile_url

            return result

        result["saved_image_error"] = f"Falha ao baixar imagem. status={resp.status_code}"
        return result

    return result
