"""Resolucao compartilhada de contextos de acesso."""

from apps.visitors.services.access import get_access_context as get_visitor_access_context


def get_enabled_access_contexts(*, profile):
    """Retorna os contextos atualmente habilitados para o profile."""

    visitor_context = get_visitor_access_context(profile=profile)
    contexts = []
    if visitor_context["matched"] and visitor_context["can_login"]:
        contexts.append(visitor_context["type"])

    return {
        "contexts": contexts,
        "primary_context": contexts[0] if contexts else "",
        "is_visitor": "yes" if "visitor" in contexts else "no",
    }
