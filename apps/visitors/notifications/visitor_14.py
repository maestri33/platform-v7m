"""Notificação para visitante em status 14."""

from .common import _resolve_first_name, _resolve_visitor, create_visitor_notification
from services.base import ServiceResponse


def build_visitor_14_notification_payload(*, visitor):
    """Monta o payload canônico da notificação de status 14."""

    first_name = _resolve_first_name(visitor)
    return {
        "title": "# Procure a recepção",
        "content": (
            f"{first_name}, foi uma alegria ter você conosco na Assembleia de Deus no Jardim Amália. 💛\n\n"
            f"{first_name}, ficamos muito felizes por sua presença em nosso culto. "
            "Receber você foi algo especial para nós, e esperamos de coração que você tenha se sentido bem, acolhido e em casa.\n\n"
            "Percebemos que o seu presente ainda não foi retirado. "
            "Pode ter sido apenas um detalhe, algo corrido na saída ou até mesmo alguma falha no processo, "
            "por isso queremos te avisar com carinho que ele continua separado para você.\n\n"
            f"Quando estiver conosco novamente, {first_name}, procure nossa equipe de recepção. "
            "Será uma alegria entregar esse presente em suas mãos e receber você mais uma vez com todo carinho.\n\n"
            f"{first_name}, você é muito bem-vindo na Assembleia de Deus no Jardim Amália, "
            "e estaremos felizes em te receber novamente. 🤍"
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
