"""Notificação para visitante em status 14."""

from .common import _resolve_first_name, _resolve_visitor, create_visitor_notification
from services.base import ServiceResponse


def build_visitor_14_notification_payload(*, visitor):
    """Monta o payload canônico da notificação de status 14."""

    first_name = _resolve_first_name(visitor)
    return {
        "title": "# Procure a recepção",
        "content": (
            f"{first_name}, foi uma alegria ter você conosco na Assembleia de Deus no Jardim Amália.\n\n"
            "Ficamos muito felizes com a sua presença e esperamos que você tenha se sentido bem e acolhido.\n\n"
            "Percebemos que o seu presente ainda não foi retirado, mas ele continua separado para você.\n\n"
            f"Na sua próxima visita, procure nossa equipe de recepção. Será um prazer te entregar e receber você novamente.\n\n"
            f"{first_name}, você é sempre bem-vindo. "
        ),
        "event_key": "visitor-status-14",
    }


def create_visitor_14_notification(*, visitor):
    """Cria a notificação de orientação para o status 14."""

    instance = _resolve_visitor(visitor)
    if not instance:
        return ServiceResponse.fail("Visitante nao encontrado.")

    payload = build_visitor_14_notification_payload(visitor=instance)
    return create_visitor_notification(
        visitor=instance,
        title=payload["title"],
        content=payload["content"],
        event_key=payload["event_key"],
    )
