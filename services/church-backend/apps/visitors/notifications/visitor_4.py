"""Notificação para visitante em status 4."""

from .common import _resolve_first_name, _resolve_visitor, create_visitor_notification
from services.base import ServiceResponse


def build_visitor_4_notification_payload(*, visitor):
    """Monta o payload canônico da notificação de status 4."""

    first_name = _resolve_first_name(visitor)
    return {
        "title": "Cadastro concluído",
        "content": (
            f"{first_name}, que alegria te encontrar por aqui...\n\n"
            "Ficamos muito felizes por você dar esse passo de se apresentar para nós.\n\n"
            "Preparamos tudo com carinho para receber você, e será uma alegria ter sua visita aqui na Assembleia de Deus no Jardim Amália.\n\n"
            f"Estamos esperando por você, {first_name}, que Deus abençoe sua vida !"
        ),
        "event_key": "visitor-status-4",
    }


def create_visitor_4_notification(*, visitor):
    """Cria a notificação de orientação para o status 4."""

    instance = _resolve_visitor(visitor)
    if not instance:
        return ServiceResponse.fail("Visitante nao encontrado.")

    payload = build_visitor_4_notification_payload(visitor=instance)
    return create_visitor_notification(
        visitor=instance,
        title=payload["title"],
        content=payload["content"],
        event_key=payload["event_key"],
    )
