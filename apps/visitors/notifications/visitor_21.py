"""Notificação para visitante em status 21."""

from .common import _resolve_first_name, _resolve_visitor, create_visitor_notification
from services.base import ServiceResponse


def build_visitor_21_notification_payload(*, visitor):
    """Monta o payload canônico da notificação de status 21."""

    first_name = _resolve_first_name(visitor)
    return {
        "title": "# Acompanhamento da recepção",
        "content": (
            f"{first_name}, foi uma grande alegria receber você hoje na Assembleia de Deus no Jardim Amália. 💛\n\n"
            "Obrigado pela sua presença — foi muito especial ter você conosco.\n\n"
            "Esperamos que você tenha se sentido bem, acolhido e amado. Preparamos tudo com carinho, e foi uma bênção conhecer você e entregar seu presente.\n\n"
            "Sua presença foi muito importante para nós, e ficamos felizes por esse primeiro momento juntos.\n\n"
            "Nossa equipe continuará em contato com você.\n\n"
            "Que Deus abençoe sua vida de forma especial."
                    ),
        "event_key": "visitor-status-21",
    }


#TODO: implementar logica para apos esta notificacao, na primeira quarta feira ou domingo, informar que te culto, 20h e 19h respectivamente e link com endereco... so texto, sem tts aqui

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
