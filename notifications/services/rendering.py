"""Utilitarios de renderizacao para notificacoes."""

import base64
import html
import mimetypes
import re

BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
ITALIC_RE = re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|_(.+?)_")
INLINE_CODE_RE = re.compile(r"`([^`]+)`")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
LIST_ITEM_RE = re.compile(r"^[-*]\s+(.*)$")
URL_PARENS_RE = re.compile(r"\s*\(https?://[^)]+\)")


def markdown_to_text(value):
    """Converte markdown simples em texto puro."""

    text = str(value or "")
    text = LINK_RE.sub(lambda match: f"{match.group(1)} ({match.group(2)})", text)
    text = INLINE_CODE_RE.sub(lambda match: match.group(1), text)
    text = BOLD_RE.sub(lambda match: match.group(1), text)
    text = ITALIC_RE.sub(lambda match: match.group(1) or match.group(2), text)
    text = re.sub(r"^\s{0,3}#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*[-*]\s+", "- ", text, flags=re.MULTILINE)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _render_inline_markdown(text):
    rendered = html.escape(str(text or ""))
    rendered = LINK_RE.sub(
        lambda match: (
            f'<a href="{html.escape(match.group(2), quote=True)}">'
            f"{html.escape(match.group(1))}</a>"
        ),
        rendered,
    )
    rendered = INLINE_CODE_RE.sub(lambda match: f"<code>{html.escape(match.group(1))}</code>", rendered)
    rendered = BOLD_RE.sub(lambda match: f"<strong>{html.escape(match.group(1))}</strong>", rendered)
    rendered = ITALIC_RE.sub(lambda match: f"<em>{html.escape(match.group(1) or match.group(2))}</em>", rendered)
    return rendered


def markdown_to_html(value):
    """Converte markdown simples em HTML adequado para e-mail."""

    lines = str(value or "").strip().splitlines()
    if not lines:
        return ""

    blocks = []
    paragraph = []
    list_items = []

    def flush_paragraph():
        if paragraph:
            blocks.append(f"<p>{'<br>'.join(_render_inline_markdown(item) for item in paragraph)}</p>")
            paragraph.clear()

    def flush_list():
        if list_items:
            blocks.append("<ul>" + "".join(f"<li>{item}</li>" for item in list_items) + "</ul>")
            list_items.clear()

    for raw_line in lines:
        line = raw_line.rstrip()
        if not line.strip():
            flush_paragraph()
            flush_list()
            continue

        heading_match = HEADING_RE.match(line)
        if heading_match:
            flush_paragraph()
            flush_list()
            level = len(heading_match.group(1))
            blocks.append(f"<h{level}>{_render_inline_markdown(heading_match.group(2))}</h{level}>")
            continue

        list_match = LIST_ITEM_RE.match(line)
        if list_match:
            flush_paragraph()
            list_items.append(_render_inline_markdown(list_match.group(1)))
            continue

        flush_list()
        paragraph.append(line)

    flush_paragraph()
    flush_list()
    return "".join(blocks)


def build_whatsapp_markdown_message(title, content):
    """Monta mensagem unica para WhatsApp com titulo destacado."""

    title_text = markdown_to_text(title)
    content_markdown = str(content or "").strip()
    if content_markdown:
        return f"**{title_text}**\n\n{content_markdown}"
    return f"**{title_text}**"


def build_tts_input(title, content):
    """Monta o texto falado no TTS sem narrar o titulo."""

    content_text = markdown_to_text(content)
    content_text = URL_PARENS_RE.sub("", content_text)
    lines = []
    for raw_line in content_text.splitlines():
        line = str(raw_line or "").strip()
        if not line:
            continue
        line = re.sub(r"^\s*-\s+", "", line)
        lines.append(line)

    normalized = " ".join(lines)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    normalized = re.sub(r"\s+([,.;:!?])", r"\1", normalized)
    if normalized and normalized[-1] not in ".!?":
        normalized = f"{normalized}."
    return normalized


def decode_media_payload(payload):
    """Decodifica base64 ou data URL para bytes."""

    raw_payload = str(payload or "").strip()
    if not raw_payload or raw_payload.startswith(("http://", "https://")):
        return None
    if ";base64," in raw_payload:
        raw_payload = raw_payload.split(";base64,", 1)[1]
    try:
        return base64.b64decode(raw_payload, validate=True)
    except Exception:
        return None


def ensure_media_filename(filename, media_type, mime_type):
    """Garante um nome de arquivo coerente com o tipo de midia."""

    cleaned = str(filename or "").strip()
    if cleaned and "." in cleaned.rsplit("/", 1)[-1]:
        return cleaned

    guessed_ext = ""
    if mime_type:
        guessed_ext = mimetypes.guess_extension(mime_type.split(";")[0].strip()) or ""

    fallback_ext = {
        "image": ".jpg",
        "video": ".mp4",
        "audio": ".mp3",
        "document": ".pdf",
    }.get(media_type, ".bin")

    extension = guessed_ext or fallback_ext
    base_name = cleaned or "media"
    return f"{base_name}{extension}"
