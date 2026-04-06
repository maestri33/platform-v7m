"""Mensagens padronizadas do fluxo de visitantes."""


AUTHENTICATION_SUCCESS_MESSAGE = "Pronto! Te enviamos um código de verificação."
LOGIN_SUCCESS_MESSAGE = "Tudo certo! Você entrou com sucesso."
REFRESH_SUCCESS_MESSAGE = "Perfeito! Sua sessão foi atualizada."


def _append_required_action(prefix, required_action=""):
    action = str(required_action or "").strip()
    if not action:
        return prefix
    return f"{prefix} Para prosseguir {action}"


def profile_saved_message(required_action=""):
    return _append_required_action(
        "Ótimo, já consegui saber mais sobre você.",
        required_action,
    )


def address_saved_message(required_action=""):
    return _append_required_action(
        "Agora já sei onde você mora.",
        required_action,
    )


def religion_saved_message(required_action=""):
    return _append_required_action(
        "Ótimo, já sei sobre sua fé.",
        required_action,
    )
