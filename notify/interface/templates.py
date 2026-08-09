"""Consulta e renderização de templates por conta."""

from __future__ import annotations

import re

_PLACEHOLDER_RE = re.compile(r"\{([a-z][a-z0-9_-]*)\}")


def get(account_id: int, event: str):
    from notify.models import Template

    return Template.objects.filter(account_id=account_id, event=event).first()


def render(body: str, ctx: dict) -> str:
    """Substitui placeholders {chave} por ctx[chave]; ausentes ficam literais."""
    if not body:
        return ""

    def _sub(m: re.Match) -> str:
        key = m.group(1)
        if key in ctx:
            return str(ctx[key])
        alias = key.replace("-", "_")
        if alias != key and alias in ctx:
            return str(ctx[alias])
        if key == "nome" and "name" in ctx:
            return str(ctx["name"])
        if key == "name" and "nome" in ctx:
            return str(ctx["nome"])
        return m.group(0)

    return _PLACEHOLDER_RE.sub(_sub, body)
