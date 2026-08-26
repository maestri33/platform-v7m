"""Busca publica de telefone para uso entre apps internos."""

from django.db.models import Q

from apps.profiles.models import Phone


def _digits(value):
    """Extrai somente digitos."""
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _phone_variants(raw_phone):
    """Gera variacoes simples para busca por numero salvo."""
    digits = _digits(raw_phone)
    if not digits:
        return []

    variants = {digits}
    canonical = digits
    if digits.startswith("55"):
        without_ddi = digits[2:]
        variants.add(without_ddi)
        canonical = digits
    else:
        canonical = f"55{digits}"
        variants.add(canonical)

    # Opcional: variação com sinal de mais para bases legadas.
    variants.add(f"+{canonical}")
    return list(variants)


def get_phone(*, phone):
    """Retorna objeto Phone se existir, senao retorna None."""
    variants = _phone_variants(phone)
    if not variants:
        return None

    query = Q()
    for value in variants:
        query |= Q(number=value)
    return Phone.objects.filter(query).select_related("profile", "profile__user").first()
