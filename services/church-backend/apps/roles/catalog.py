"""Catálogo de transições de papel, lido de ``settings.ROLE_RULES``.

Cada regra tem a forma ``{"from_role": null|str, "to_role": str, "mode": str}``.
Transição ausente do catálogo é proibida — é assim que "visitante → membro"
(pulando congregado) fica barrado sem precisar de regra negativa.

As regras são lidas a cada consulta, e não no import, para que ``override_settings``
funcione nos testes.
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _rules():
    """``{(from_role, to_role): mode}``. Catálogo malformado vira dicionário vazio."""

    try:
        rules = {}
        for rule in getattr(settings, "ROLE_RULES", None) or []:
            to_role = str(rule.get("to_role") or "")
            if not to_role:
                continue
            from_role = str(rule.get("from_role") or "")
            rules[(from_role, to_role)] = str(rule.get("mode") or "add")
        return rules
    except Exception:
        # Sem catálogo nenhuma transição é permitida — falha fechada, e o boot
        # segue de pé com o erro registrado.
        logger.error("ROLE_RULES malformado; catálogo de papéis vazio.", exc_info=True)
        return {}


def transition_mode(from_role, to_role):
    """Modo da transição ("add"/"replace"), ou ``None`` quando não permitida."""

    return _rules().get((str(from_role or ""), str(to_role or "")))


def is_allowed(from_role, to_role):
    return transition_mode(from_role, to_role) is not None
