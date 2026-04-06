"""Mensagens padronizadas do fluxo de visitantes."""


AUTHENTICATION_SUCCESS_MESSAGE = "Codigo de verificacao enviado com sucesso."
LOGIN_SUCCESS_MESSAGE = "Login realizado com sucesso."
REFRESH_SUCCESS_MESSAGE = "Token atualizado com sucesso."
ADDRESS_LOOKUP_SUCCESS_MESSAGE = "CEP localizado com sucesso."
LOGIN_REQUIRED_MESSAGE = "Sua sessao nao esta valida. Informe seu telefone novamente."
RESTART_FLOW_MESSAGE = "Vamos tentar de novo... digite seu telefone corretamente!"
LOGOUT_SUCCESS_MESSAGE = "Voce saiu com sucesso. Se quiser continuar, e so digitar seu telefone novamente!"
PHONE_INVALID_MESSAGE = "Informe um numero de telefone valido."
INVALID_BIRTH_DATE_MESSAGE = "Informe uma data de nascimento valida."
SELECT_RELIGION_MESSAGE = "Selecione uma religiao para continuar."
CHRISTIANITY_PROMPT_MESSAGE = "Para continuar, selecione a opção que mais se aproxima da sua caminhada cristã."
EVANGELICAL_PROMPT_MESSAGE = "Agora nos informe sua igreja e se você está em comunhão, por favor."


def _append_required_action(prefix, required_action=""):
    action = str(required_action or "").strip()
    if not action:
        return prefix
    return f"{prefix} Proximo passo: {action}"


def profile_saved_message(required_action=""):
    return _append_required_action(
        "Parabens! Seus dados principais foram salvos com sucesso.",
        required_action,
    )


def address_saved_message(required_action=""):
    return _append_required_action(
        "Parabens! Seu endereco foi salvo com sucesso.",
        required_action,
    )


def religion_saved_message(required_action=""):
    return _append_required_action(
        "Parabens! Seus dados religiosos foram salvos com sucesso.",
        required_action,
    )
