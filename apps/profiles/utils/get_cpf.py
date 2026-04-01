"""Busca publica de CPF para uso entre apps internos."""

from django.db.models import Q

from apps.profiles.models import CPF


def _digits(value):
    """Extrai somente digitos."""
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _cpf_variants(raw_cpf):
    """Gera variacoes comuns de armazenamento do CPF."""
    digits = _digits(raw_cpf)
    if len(digits) != 11:
        return []
    return [
        digits,
        f"{digits[0:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:11]}",
    ]


def get_cpf(*, cpf):
    """Retorna objeto CPF se existir, senao retorna None."""
    variants = _cpf_variants(cpf)
    if not variants:
        return None

    query = Q()
    for value in variants:
        query |= Q(number=value)
    return CPF.objects.filter(query).select_related("profile", "profile__user").first()
