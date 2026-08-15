"""Render de template de email — porte EXATO do monólito (integrations/communication/mail/templates.py).

HTML shells em mail/templates/<slug>.html. md_to_html XSS-safe. media_html para embutir mídia.
"""

from __future__ import annotations

import html as _html
import re
from functools import lru_cache
from pathlib import Path

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
_SAFE_URL_SCHEMES = {"http", "https", "mailto"}
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


class TemplateNotFound(Exception):
    pass


def _md_inline(escaped: str) -> str:
    """Inline markdown (JÁ escapado): bold, italic, code, links."""
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)

    def _link(m: re.Match) -> str:
        label, url = m.group(1), m.group(2).strip()
        scheme = url.split(":", 1)[0].lower() if ":" in url else ""
        if scheme and scheme not in _SAFE_URL_SCHEMES:
            return f"{label} ({url})"
        return f'<a href="{url}" target="_blank" rel="noopener">{label}</a>'

    escaped = _LINK_RE.sub(_link, escaped)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped, flags=re.DOTALL)
    escaped = re.sub(
        r"(?<![*\w])\*([^*\s](?:.*?[^*\s])?)\*(?![*\w])", r"<em>\1</em>", escaped, flags=re.DOTALL
    )
    escaped = re.sub(
        r"(?<![\w])_([^_\s](?:.*?[^_\s])?)_(?![\w])", r"<em>\1</em>", escaped, flags=re.DOTALL
    )
    return escaped


def md_to_html(md: str) -> str:
    """Markdown → HTML seguro pro e-mail. Escape primeiro, depois transforms (XSS-safe)."""
    if not md:
        return ""
    escaped = _html.escape(md)
    lines = escaped.split("\n")
    out: list[str] = []
    list_buf: list[str] = []
    list_type: str | None = None

    def _flush_list() -> None:
        nonlocal list_buf, list_type
        if list_type:
            tag = "ul" if list_type == "ul" else "ol"
            out.append(
                f"<{tag}>" + "".join(f"<li>{_md_inline(it)}</li>" for it in list_buf) + f"</{tag}>"
            )
            list_buf, list_type = [], None

    for raw in lines:
        line = raw.rstrip()
        if not line:
            _flush_list()
            out.append("")
            continue
        m = re.match(r"^(#{1,3})\s+(.*)$", line)
        if m:
            _flush_list()
            level = len(m.group(1))
            out.append(f"<h{level}>{_md_inline(m.group(2))}</h{level}>")
            continue
        mo = re.match(r"^\d+\.\s+(.*)$", line)
        if mo:
            if list_type != "ol":
                _flush_list()
            list_type = "ol"
            list_buf.append(mo.group(1))
            continue
        mu = re.match(r"^[-*]\s+(.*)$", line)
        if mu:
            if list_type != "ul":
                _flush_list()
            list_type = "ul"
            list_buf.append(mu.group(1))
            continue
        _flush_list()
        out.append(_md_inline(line))

    _flush_list()
    html_parts: list[str] = []
    para: list[str] = []
    for blk in out:
        if blk == "":
            if para:
                html_parts.append("<p>" + "<br>".join(para) + "</p>")
                para = []
        elif blk.startswith(("<h1", "<h2", "<h3", "<ul", "<ol")):
            if para:
                html_parts.append("<p>" + "<br>".join(para) + "</p>")
                para = []
            html_parts.append(blk)
        else:
            para.append(blk)
    if para:
        html_parts.append("<p>" + "<br>".join(para) + "</p>")
    return "\n".join(html_parts)


def text_to_html(text: str) -> str:
    """Compat: alias de `md_to_html`."""
    return md_to_html(text)


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
            raise TemplateNotFound("template 'default' ausente em mail/templates/") from None
        try:
            template = _load(DEFAULT_SLUG)
        except FileNotFoundError:
            raise TemplateNotFound("template 'default' ausente em mail/templates/") from None

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


# ── Shell por conta (MailTemplate no DB) ────────────────────────────────────
# Os arquivos acima continuam sendo o piso: quem nunca personalizou usa
# `default.html`. Mas a marca de um app não deveria exigir deploy, então a conta
# pode guardar o próprio shell no banco e editá-lo pelo dashboard (ou pela IA).

def render_shell(
    shell_html: str,
    *,
    title: str,
    content: str,
    content_is_html: bool = False,
    service_name: str = "Notify",
) -> str:
    """Aplica um shell HTML arbitrário (vindo do DB) ao conteúdo."""
    safe_title = _html.escape(title)
    safe_content = content if content_is_html else md_to_html(content)
    return (
        shell_html.replace("{{title}}", safe_title)
        .replace("{{content}}", safe_content)
        .replace("{{service_name}}", _html.escape(service_name))
    )


def shell_for_account(account):
    """MailTemplate válido da conta, ou None para cair no arquivo."""
    from channels.models import MailTemplate

    row = MailTemplate.objects.filter(account=account).first()
    return row if (row is not None and row.is_valid) else None


def render_for_account(
    account,
    slug: str | None,
    *,
    title: str,
    content: str,
    content_is_html: bool = False,
) -> str:
    """Render do e-mail da conta: shell do DB se houver, senão o arquivo `slug`."""
    row = shell_for_account(account)
    if row is not None:
        return render_shell(
            row.html,
            title=title,
            content=content,
            content_is_html=content_is_html,
            service_name=row.brand_name or account.name,
        )
    return render(
        slug,
        title=title,
        content=content,
        content_is_html=content_is_html,
        service_name=account.name,
    )


DEFAULT_SHELL_HTML = _load(DEFAULT_SLUG) if (_TEMPLATES_DIR / f"{DEFAULT_SLUG}.html").exists() else ""
