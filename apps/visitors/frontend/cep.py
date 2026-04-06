"""Helpers de CEP do frontend de visitors."""

import json
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from .state import digits, format_zipcode


def address_lookup_context_from_cep(zipcode, payload):
    return {
        "address": {
            "zipcode": format_zipcode(zipcode),
            "street": str(payload.get("logradouro", "") or "").strip(),
            "number": "",
            "complement": str(payload.get("complemento", "") or "").strip(),
            "neighborhood": str(payload.get("bairro", "") or "").strip(),
            "city": str(payload.get("localidade", "") or "").strip(),
            "state": str(payload.get("uf", "") or "").strip(),
            "country": "Brasil",
        }
    }


def fetch_cep_data(zipcode):
    digits_only = digits(zipcode)
    if len(digits_only) != 8:
        return None, "Informe um CEP valido com 8 digitos."

    try:
        with urlopen(f"https://viacep.com.br/ws/{digits_only}/json/", timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, ValueError):
        return None, "Nao foi possivel consultar o CEP agora."

    if payload.get("erro"):
        return None, "CEP nao encontrado."

    return payload, None
