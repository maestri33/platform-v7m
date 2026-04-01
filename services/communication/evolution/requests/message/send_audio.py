"""Acao de envio de audio (sendWhatsAppAudio).

Este modulo envia audio para WhatsApp usando o endpoint de audio da Evolution API.
"""

from services.communication.evolution.requests import EvolutionRequestClient


def send_audio(*, number, audio, delay=0, ptt=True):
    """Envia audio em formato WhatsApp.

    Parametros obrigatorios:
    - number: numero destino. Aceita com ou sem DDI (55).
      A normalizacao e feita automaticamente pelo client base.
    - audio: URL publica do arquivo de audio ou conteudo em base64 (conforme API).

    Parametros opcionais:
    - delay (padrao=0): atraso em ms antes do envio.
    - ptt (padrao=True): define se deve enviar como "audio de voz" (push-to-talk).
      - True: envia como voz (bolha de audio estilo gravacao).
      - False: envia como audio comum.

    Retorno:
    - dict com resposta da Evolution API, incluindo "_http_status".

    Exemplo de uso:
        send_audio(
            number="43996648750",
            audio="https://samplelib.com/lib/preview/mp3/sample-3s.mp3",
            ptt=True,
        )

    Observacoes praticas:
    - Se a URL nao for acessivel pelo servidor da Evolution, pode retornar erro 500/404.
    - Para evitar falhas, use URL HTTPS publica e estavel.
    """
    if not number:
        raise ValueError("number is required")
    if not audio:
        raise ValueError("audio is required")

    client = EvolutionRequestClient()
    # Numero sempre sai no padrao BR (55 + DDD + numero) para evitar erro de formato.
    payload = {
        "number": client.normalize_number(number),
        "audio": audio,
        "delay": int(delay),
        "ptt": bool(ptt),
    }
    return client.post(f"/message/sendWhatsAppAudio/{client.instance}", payload)
