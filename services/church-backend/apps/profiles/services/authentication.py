"""Servicos de autenticacao do app profiles."""

from apps.authentication.services.otp import generate_login_otp


def generate_user_otp(*, user):
    """Gera OTP de 6 digitos, salva como senha do usuario e retorna o codigo."""

    return generate_login_otp(user=user)
