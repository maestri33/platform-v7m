"""Render de template de email — porte EXATO do monólito (integrations/communication/mail/templates.py).

HTML shells em mail/templates/<slug>.html. md_to_html XSS-safe. media_html para embutir mídia.
"""

from __future__ import annotations

import html as _html
import re
from functools import lru_cache
from pathlib import Path

from django.utils.html import conditional_escape, linebreaks

DEFAULT_SLUG = "default"
_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,62}[a-z0-9]$")
_SLUG_ALIASES = {
    "checkout": "supletivo",
    "parabens": "supletivo",
    "receipt": "supletivo",
    "welcome": "supletivo",
}

MEDIA_TYPES = {"image", "video", "audio", "document"}


def md_to_html(md: str) -> str:
    return linebreaks(conditional_escape(md)) if md else ""


def media_html(media_url: str, media_type: str, caption: str = "") -> str:
    """Snippet HTML pra embutir mídia no email por URL."""
    if media_type not in MEDIA_TYPES:
        media_type = "document"
    safe_url = _html.escape(media_url)
    safe_caption = _html.escape(caption)

    if media_type == "image":
        return (
            '<div style="margin:20px 0;text-align:center">'
            f'<img src="{safe_url}" alt="{safe_caption}" '
            'style="max-width:100%;height:auto;border-radius:4px">'
            '<p style="margin:8px 0 0;color:#666;font-size:14px;font-family:Arial,sans-serif">'
            f"{safe_caption}</p></div>"
        )
    if media_type == "video":
        return (
            '<div style="margin:20px 0;text-align:center">'
            '<p style="font-size:40px;margin:0">&#9654;&#65039;</p>'
            f'<p style="margin:8px 0;font-family:Arial,sans-serif;font-size:15px;color:#333">{safe_caption}</p>'
            f'<a href="{safe_url}" target="_blank" style="color:#1a73e8;font-family:Arial,sans-serif;font-size:14px">'
            "Assistir v&iacute;deo</a></div>"
        )
    if media_type == "audio":
        return (
            '<div style="margin:20px 0;text-align:center">'
            '<p style="font-size:36px;margin:0">&#127911;</p>'
            f'<p style="margin:8px 0;font-family:Arial,sans-serif;font-size:15px;color:#333">{safe_caption}</p>'
            f'<a href="{safe_url}" target="_blank" style="color:#1a73e8;font-family:Arial,sans-serif;font-size:14px">'
            "Ouvir &aacute;udio</a></div>"
        )
    safe_name = _html.escape(media_url.rsplit("/", 1)[-1] if "/" in media_url else "arquivo")
    return (
        '<div style="margin:20px 0;text-align:center">'
        '<p style="font-size:36px;margin:0">&#128206;</p>'
        f'<p style="margin:4px 0;font-family:Arial,sans-serif;font-size:13px;color:#666">{safe_name}</p>'
        f'<p style="margin:8px 0;font-family:Arial,sans-serif;font-size:15px;color:#333">{safe_caption}</p>'
        f'<a href="{safe_url}" target="_blank" style="color:#1a73e8;font-family:Arial,sans-serif;font-size:14px">'
        "Baixar arquivo</a></div>"
    )


@lru_cache(maxsize=32)
def _load(slug: str) -> str:
    return (_TEMPLATES_DIR / f"{slug}.html").read_text(encoding="utf-8")


def render(
    slug: str | None,
    *,
    title: str,
    content: str,
    content_is_html: bool = False,
    service_name: str = "Notify",
) -> str:
    """Renderiza template HTML do slug (fallback `default`)."""
    resolved = slug if (slug and _SLUG_RE.match(slug)) else DEFAULT_SLUG
    resolved = _SLUG_ALIASES.get(resolved, resolved)
    try:
        template = _load(resolved)
    except FileNotFoundError:
        if resolved == DEFAULT_SLUG:
            raise
        template = _load(DEFAULT_SLUG)

    safe_title = _html.escape(title)
    if content_is_html:
        safe_content = content
    else:
        safe_content = md_to_html(content)
    return (
        template.replace("{{title}}", safe_title)
        .replace("{{content}}", safe_content)
        .replace("{{service_name}}", _html.escape(service_name))
    )
