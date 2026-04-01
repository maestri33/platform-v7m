"""Acao de envio de texto simples (sendText).

Este modulo concentra a chamada de envio de mensagem de texto da Evolution API.
Use esta funcao quando quiser mandar apenas texto para um numero WhatsApp.
"""

from services.communication.evolution.requests import EvolutionRequestClient


def send_text(*, number, text, delay=0, link_preview=True):
    """Envia mensagem de texto para um numero WhatsApp.

    Parametros obrigatorios:
    - number: numero destino. Pode vir com ou sem DDI, pois o client normaliza.
      Exemplos aceitos: "43996648750", "5543996648750", "+55 (43) 99664-8750".
    - text: conteudo textual da mensagem.

    Parametros opcionais:
    - delay (padrao=0): atraso (ms) antes do envio no lado da API.
      Use quando quiser espaciar envios em lote.
    - link_preview (padrao=True): habilita preview automatico de links.
      Defina False para enviar texto sem card de URL.

    Retorno:
    - dict com resposta da Evolution API, incluindo "_http_status".

    Exemplo de uso:
        send_text(
            number="43996648750",
            text="Oi! Esta e uma mensagem de teste.",
            delay=500,
            link_preview=False,
        )
    """
    if not number:
        raise ValueError("number is required")
    if not text:
        raise ValueError("text is required")

    client = EvolutionRequestClient()
    # Numero sempre sai no padrao BR (55 + DDD + numero) para evitar erro de formato.
    payload = {
        "number": client.normalize_number(number),
        "text": text,
        "delay": int(delay),
        "linkPreview": bool(link_preview),
    }
    return client.post(f"/message/sendText/{client.instance}", payload)
