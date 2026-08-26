"""Acao de envio de midia (sendMedia).

Permite enviar imagem, video ou documento para WhatsApp via Evolution API.
"""

from services.communication.evolution.requests import EvolutionRequestClient


def send_media(
    *,
    number,
    media,
    media_type="image",
    mime_type="image/jpeg",
    caption="",
    file_name="media",
    delay=0,
):
    """Envia imagem/documento/video com legenda opcional.

    Parametros obrigatorios:
    - number: numero destino (normalizado automaticamente para DDI 55).
    - media: URL publica da midia ou base64.

    Parametros opcionais:
    - media_type (padrao="image"): tipo da midia.
      Opcoes praticas:
      - "image": imagens em geral (png/jpg/webp).
      - "video": videos (mp4 recomendado).
      - "document": documentos (pdf/doc/xls etc).
    - mime_type (padrao="image/jpeg"): mime type do arquivo.
      Exemplos: image/jpeg, image/png, video/mp4, application/pdf.
    - caption (padrao=""): legenda para acompanhar a midia.
    - file_name (padrao="media"): nome logico do arquivo (mais util em document).
    - delay (padrao=0): atraso em ms antes do envio.

    Retorno:
    - dict com resposta da Evolution API, incluindo "_http_status".

    Exemplo (video):
        send_media(
            number="43996648750",
            media="https://example.com/video.mp4",
            media_type="video",
            mime_type="video/mp4",
            caption="Video de teste",
            file_name="teste.mp4",
        )
    """
    if not number:
        raise ValueError("number is required")
    if not media:
        raise ValueError("media is required")

    client = EvolutionRequestClient()
    # Numero sempre sai no padrao BR (55 + DDD + numero) para evitar erro de formato.
    payload = {
        "number": client.normalize_number(number),
        "mediatype": media_type,
        "mimetype": mime_type,
        "media": media,
        "caption": caption,
        "fileName": file_name,
        "delay": int(delay),
    }
    return client.post(f"/message/sendMedia/{client.instance}", payload)
