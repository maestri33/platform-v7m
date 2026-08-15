"""Ferramenta para verificar se numeros existem no WhatsApp.

Este modulo centraliza a chamada do endpoint:
- POST /chat/whatsappNumbers/{instance}
"""

from services.communication.evolution.requests import EvolutionRequestClient


def check_numbers(*, numbers):
    """Verifica uma lista de numeros no WhatsApp.

    Parametros obrigatorios:
    - numbers: lista de numeros (str/int) para validacao.
      Exemplos aceitos: "43996648750", "5543996648750", "+55 (43) 99664-8750".

    Retorno:
    - dict no formato padronizado do client base:
      - "data": lista com resultado por numero (jid, exists, number).
      - "_http_status": status HTTP da resposta da Evolution API.

    Observacoes:
    - A normalizacao para DDI 55 e feita automaticamente no client.
    - Se a lista vier vazia, a funcao levanta ValueError.
    """
    if not numbers:
        raise ValueError("numbers is required")

    client = EvolutionRequestClient()

    # Cada numero e convertido para o padrao BR antes da consulta.
    payload = {"numbers": [client.normalize_number(number) for number in numbers]}
    return client.post(f"/chat/whatsappNumbers/{client.instance}", payload)
