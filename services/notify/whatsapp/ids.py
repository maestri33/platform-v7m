"""Extração do id da mensagem na resposta de envio dos provedores.

Cada provedor devolve o id num lugar: a Evolution v2 em `key.id`, a GO num
`data.Id`/`id` dependendo da rota. Sem esse id, o `MESSAGES_UPDATE` que chega
depois não tem em qual notificação encostar — e o status de entrega para em
"aceito pelo provedor" para sempre.
"""

from __future__ import annotations

from typing import Any

_ID_FIELDS = ("id", "Id", "ID", "messageId", "MessageID", "keyId", "messageID")


def extract_message_id(payload: Any, _depth: int = 0) -> str:
    """Melhor esforço para achar o id da mensagem em qualquer formato."""
    if _depth > 4 or not isinstance(payload, dict):
        return ""

    key = payload.get("key")
    if isinstance(key, dict):
        for field in _ID_FIELDS:
            if key.get(field):
                return str(key[field])

    for field in _ID_FIELDS:
        value = payload.get(field)
        if isinstance(value, (str, int)) and str(value).strip():
            return str(value)

    for nested in ("data", "response", "result", "message"):
        inner = payload.get(nested)
        if isinstance(inner, dict):
            found = extract_message_id(inner, _depth + 1)
            if found:
                return found
        if isinstance(inner, list) and inner and isinstance(inner[0], dict):
            found = extract_message_id(inner[0], _depth + 1)
            if found:
                return found
    return ""
