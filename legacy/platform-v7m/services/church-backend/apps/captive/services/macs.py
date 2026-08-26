"""Normalização e validação de endereços MAC."""

import re

MAC_PATTERN = re.compile(r"^[0-9A-F]{2}(:[0-9A-F]{2}){5}$")


def normalize_mac(value):
    """Normaliza pro formato canônico ``AA:BB:CC:DD:EE:FF``; "" se inválido."""

    raw = re.sub(r"[^0-9a-fA-F]", "", str(value or ""))
    if len(raw) != 12:
        return ""
    mac = ":".join(raw[i : i + 2] for i in range(0, 12, 2)).upper()
    return mac if MAC_PATTERN.match(mac) else ""
