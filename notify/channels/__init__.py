"""Envio por canal — extraído de notify.dispatch para concentrar a regra de cada canal num lugar.

Cada módulo aqui é responsável por UMA classe de canal (whatsapp, email, tts). O
`dispatcher` sabe qual canal chamar em qual situação. `notify.dispatch` continua
sendo o entrypoint do django-q — só que agora chama `dispatcher.dispatch_channels`
em vez dos antigos `_send_*` privados.
"""

from .dispatcher import dispatch_channels

__all__ = ["dispatch_channels"]
