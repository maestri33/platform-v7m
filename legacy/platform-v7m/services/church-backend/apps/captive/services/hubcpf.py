"""Cliente mínimo do HubCPF (CPFHub.io) — nome, sexo e nascimento por CPF.

Usa as settings ``CPFHUB_*`` já existentes. A resposta é persistida em
``CpfRecord.enriched`` (o design pede cache), então cada CPF só é
consultado uma vez.
"""

import logging
from datetime import datetime

import requests
from django.conf import settings

from services.base import ServiceResponse

logger = logging.getLogger(__name__)


def _parse_birth_date(value):
    raw = str(value or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(raw[:10], fmt).date()
        except ValueError:
            continue
    return None


def _normalize_gender(value):
    raw = str(value or "").strip().lower()
    if raw in ("m", "masculino", "male"):
        return "male"
    if raw in ("f", "feminino", "female"):
        return "female"
    return ""


def lookup_cpf(cpf):
    """Consulta o CPF no HubCPF; retorna nome/sexo/nascimento normalizados."""

    api_key = str(getattr(settings, "CPFHUB_API_KEY", "") or "")
    if not api_key:
        return ServiceResponse.fail("CPFHUB_API_KEY não configurada.")

    url = str(getattr(settings, "CPFHUB_API_URL", "https://api.cpfhub.io/cpf"))
    timeout = int(getattr(settings, "CPFHUB_REQUEST_TIMEOUT", 10))
    try:
        response = requests.post(
            url,
            json={"cpf": cpf},
            headers={"x-api-key": api_key, "Content-Type": "application/json"},
            timeout=timeout,
        )
    except requests.RequestException as exc:
        logger.warning("HubCPF indisponível: %s", exc)
        return ServiceResponse.fail(f"HubCPF indisponível: {exc}")

    if response.status_code >= 300:
        return ServiceResponse.fail(f"HubCPF HTTP {response.status_code}.")

    try:
        payload = response.json()
    except ValueError:
        return ServiceResponse.fail("HubCPF retornou resposta não-JSON.")

    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    name = str(data.get("name") or data.get("nome") or "").strip()
    gender = _normalize_gender(data.get("gender") or data.get("sexo"))
    birth_date = _parse_birth_date(
        data.get("birthDate") or data.get("birth_date") or data.get("nascimento")
    )
    if not name:
        return ServiceResponse.fail("HubCPF não retornou dados pro CPF.")

    return ServiceResponse.ok(
        data={
            "name": name,
            "gender": gender,
            "birth_date": birth_date,
            "raw": data,
        }
    )
