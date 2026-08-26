"""Sanitização de texto para WhatsApp — porte EXATO do monólito. Função PURA, sem I/O."""

from __future__ import annotations

import re

_MD_MARKERS = re.compile(r"[*_~`]+")
_URL = re.compile(r"(https?://\S+|www\.\S+)", re.IGNORECASE)
_EMOJI = re.compile(
    "["
    "\U0001f000-\U0001faff"
    "\U00002600-\U000027bf"
    "\U0000fe00-\U0000fe0f"
    "\U00002190-\U000021ff"
    "\U00002b00-\U00002bff"
    "\U0000200d"
    "]+",
    flags=re.UNICODE,
)
_MULTISPACE = re.compile(r"[ \t]{2,}")

_WA_LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
_WA_BOLD_STAR = re.compile(r"\*\*(.+?)\*\*")
_WA_BOLD_UNDER = re.compile(r"__(.+?)__")
_WA_ITALIC = re.compile(r"\*([^*\n]+?)\*")
_WA_HEADING = re.compile(r"(?m)^[ \t]{0,3}#{1,6}[ \t]*")
_WA_QUOTE = re.compile(r"(?m)^[ \t]{0,3}>[ \t]?")
_BOLD_TOKEN = "\x00"


def for_whatsapp(md: str | None) -> str:
    """Converte markdown para marcação NATIVA do WhatsApp."""
    if not md:
        return ""
    out = _WA_LINK.sub(r"\1 (\2)", md)
    out = _WA_BOLD_STAR.sub(rf"{_BOLD_TOKEN}\1{_BOLD_TOKEN}", out)
    out = _WA_BOLD_UNDER.sub(rf"{_BOLD_TOKEN}\1{_BOLD_TOKEN}", out)
    out = _WA_ITALIC.sub(r"_\1_", out)
    out = out.replace(_BOLD_TOKEN, "*")
    out = _WA_HEADING.sub("", out)
    out = _WA_QUOTE.sub("", out)
    return out
