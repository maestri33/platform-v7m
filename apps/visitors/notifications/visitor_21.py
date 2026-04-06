"""Notificação para visitante em status 21."""

from .common import _resolve_first_name, _resolve_visitor, create_visitor_notification
from services.base import ServiceResponse


def build_visitor_21_notification_payload(*, visitor):
    """Monta o payload canônico da notificação de status 21."""

    first_name = _resolve_first_name(visitor)
    return {
        "title": "# Acompanhamento da recepção",
        "content": (
    f"{first_name}, foi uma alegria muito grande receber você hoje na Assembleia de Deus no Jardim Amália. 💛\n\n"
    f"{first_name}, queremos agradecer pela sua presença. Foi muito especial ter você conosco, "
    "e nosso coração se alegra por saber que você esteve em nosso culto e permitiu que esse momento fosse vivido junto com a gente.\n\n"
    f"Esperamos que você tenha se sentido bem, acolhido e amado, {first_name}. "
    "Preparamos cada detalhe com carinho, e foi uma bênção poder entregar seu presente e conhecer um pouco de você.\n\n"
    "Saiba que a sua presença não passou despercebida. "
    "Nós, da Assembleia de Deus no Jardim Amália, estamos felizes por esse primeiro momento que tivemos com você.\n\n"
    f"{first_name}, nossa equipe continuará em contato com você, com carinho e atenção. "
    "Desejamos que esta noite permaneça no seu coração e que Deus abençoe sua vida de forma especial. 🤍"
        ),
        "event_key": "visitor-status-21",
    }


def create_visitor_21_notification(*, visitor):
    """Cria a notificação de orientação para o status 21."""

    instance = _resolve_visitor(visitor)
    if not instance:
        return ServiceResponse.fail("Visitante nao encontrado.")

    payload = build_visitor_21_notification_payload(visitor=instance)
    return create_visitor_notification(
        visitor=instance,
        title=payload["title"],
        content=payload["content"],
        event_key=payload["event_key"],
    )
