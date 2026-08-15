"""Validação de formato de CPF e phone — fail-fast antes de chamar serviço externo (porte do legado).

Só FORMATO aqui (regra barata, local). A veracidade ("nem falsos", spec auth) é checada no register
contra serviços REAIS: CPFHub (a identidade existe) e WhatsApp check_numbers (o número existe no zap).
"""

from __future__ import annotations

import re


def validate_cpf(cpf: str) -> str:
    """Normaliza e valida o FORMATO do CPF. Retorna 11 dígitos ou levanta ValueError."""
    clean = re.sub(r"\D", "", cpf)
    if len(clean) != 11:
        raise ValueError(f"CPF deve ter 11 dígitos, encontrados {len(clean)}.")
    if clean == clean[0] * 11:
        raise ValueError("CPF não pode ter todos os dígitos iguais.")
    return clean


def cpf_check_digits_ok(cpf: str) -> bool:
    """Dígitos verificadores do CPF (mod-11). Usado pelo passo 3 do funil v2 (`confirm_identity`)
    ANTES do lookup no CPFHub — DV errado nem gasta chamada externa. O `validate_cpf` continua
    só-formato (o register legado delega a veracidade ao CPFHub e tolera o serviço fora)."""

    def dv(digits: str) -> int:
        weight = len(digits) + 1
        total = sum(int(d) * (weight - i) for i, d in enumerate(digits))
        rest = (total * 10) % 11
        return 0 if rest == 10 else rest

    return dv(cpf[:9]) == int(cpf[9]) and dv(cpf[:10]) == int(cpf[10])


def validate_phone(phone: str) -> str:
    """Normaliza pro formato canônico DDI+DDD+número (BR). Retorna 12 ou 13 dígitos ou ValueError.

    Aceita com DDI (`55…`, 12/13 díg) ou sem (10/11 díg, DDD+número) — neste caso prefixa `55`.
    É o formato que o WhatsApp/notify (resolve_br_number) consomem.
    """
    clean = re.sub(r"\D", "", phone)
    if clean.startswith("55"):
        if len(clean) not in (12, 13):
            raise ValueError(
                f"Telefone BR com DDI deve ter 12 ou 13 dígitos, encontrados {len(clean)}."
            )
        return clean
    if len(clean) in (10, 11):
        return "55" + clean
    raise ValueError(
        f"Telefone deve ter 10 ou 11 dígitos (DDD+número), encontrados {len(clean)}."
    )
