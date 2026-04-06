"""Notificação para visitante em status 4."""

from .common import _resolve_first_name, _resolve_visitor, create_visitor_notification
from services.base import ServiceResponse


def build_visitor_4_notification_payload(*, visitor):
    """Monta o payload canônico da notificação de status 4."""

    first_name = _resolve_first_name(visitor)
    return {
        "title": "Cadastro concluído",
                "content": (
            f"{first_name}, que alegria ter você aqui.\n\n"
            f"{first_name}, receber o seu cadastro foi muito especial para nós. "
            "Saber que você viu um pouco da nossa igreja, sentiu algo no coração "
            "e decidiu dar esse passo para nos conhecer nos enche de alegria.\n\n"
            "Nós somos a Assembleia de Deus no Jardim Amália, e queremos dizer a você: "
            "você não é apenas mais um cadastro para nós. "
            "Você é alguém que queremos receber com amor, atenção e carinho.\n\n"
        ),
        
#        "content": (
#            f"{first_name}, que alegria ter você aqui.\n\n"
#            f"{first_name}, receber o seu cadastro foi muito especial para nós. "
#            "Saber que você viu um pouco da nossa igreja, sentiu algo no coração "
#            "e decidiu dar esse passo para nos conhecer nos enche de alegria.\n\n"
#            "Nós somos a Assembleia de Deus no Jardim Amália, e queremos dizer a você: "
#            "você não é apenas mais um cadastro para nós. "
#            "Você é alguém que queremos receber com amor, atenção e carinho.\n\n"
#            f"Preparamos um presente para você, {first_name}, mas mais do que um presente, "
#            "queremos oferecer um lugar onde você se sinta bem-vindo, em casa e cuidado.\n\n"
#            "Agora, o próximo passo é sua visita presencial à Assembleia de Deus no Jardim Amália. "
#            f"Será uma alegria olhar nos seus olhos, te dar as boas-vindas e receber você, {first_name}, "
#            "com todo amor.\n\n"
#            f"{first_name}, estamos te esperando."
#        ),
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
