#!/usr/bin/env python3
"""Redirecionador do captive portal — roda no gateway, porta 8081.

O firewall DNAT'a todo HTTP (porta 80) de clientes ainda não liberados pra
cá. Respondemos 302 pro portal na nuvem com o MAC do cliente (resolvido na
tabela ARP do gateway) — é isso que faz o Android/iOS abrirem o mini-browser
de "entrar na rede".

Config via ambiente:
  CAPTIVE_CLOUD_URL     base do backend (ex: https://backend.ieadpg.org)
  CAPTIVE_REDIRECT_PORT porta local (default 8081)
"""

import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CLOUD_URL = os.environ.get("CAPTIVE_CLOUD_URL", "http://localhost:8000").rstrip("/")
PORT = int(os.environ.get("CAPTIVE_REDIRECT_PORT", "8081"))
MAC_RE = re.compile(r"^([0-9a-f]{2}:){5}[0-9a-f]{2}$", re.I)


def mac_for_ip(ip):
    """Resolve o MAC do cliente pela tabela ARP do kernel."""

    try:
        with open("/proc/net/arp") as fh:
            for line in fh.readlines()[1:]:
                parts = line.split()
                if (
                    len(parts) >= 4
                    and parts[0] == ip
                    and MAC_RE.match(parts[3])
                    and parts[3] != "00:00:00:00:00:00"
                ):
                    return parts[3]
    except OSError:
        pass
    return ""


class RedirectHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _redirect(self):
        mac = mac_for_ip(self.client_address[0])
        target = f"{CLOUD_URL}/portal/" + (f"?mac={mac}" if mac else "")
        self.send_response(302)
        self.send_header("Location", target)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        self._redirect()

    def do_HEAD(self):
        self._redirect()

    def do_POST(self):
        self._redirect()


if __name__ == "__main__":
    print(f"redirecionador captive em :{PORT} → {CLOUD_URL}/portal/", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), RedirectHandler).serve_forever()
