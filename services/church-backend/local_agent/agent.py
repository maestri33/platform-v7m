#!/usr/bin/env python3
"""Agente local do Captive Portal IEADPG — roda na rede da igreja.

É a ponta local do design "Fluxo Captive Portal IEADPG": fica ao lado do
controlador Wi-Fi e conversa com o backend na nuvem.

Fluxo:
1. dispositivo associa ao SSID → ``session-start <mac>`` avisa a nuvem.
   MAC conhecido: a resposta já traz a credencial → libera na hora.
   MAC desconhecido: a resposta traz ``portal_url`` → o controlador
   redireciona o dispositivo pro portal (HTMX, na nuvem).
2. usuário confirma o OTP no portal → a nuvem devolve a liberação:
   push HTTP assinado (HMAC) neste agente (``--listen``) e/ou polling em
   ``GET /portal/agent/grants``.
3. o agente valida a assinatura da credencial (identifica o MAC), aplica a
   liberação no controlador (``RELEASE_CMD``) e confirma com
   ``POST /portal/agent/grants/ack`` — só aí o backend considera a
   internet liberada.

Sem dependências externas — só stdlib (urllib/http.server/hmac).

Config via variáveis de ambiente:
  CAPTIVE_CLOUD_URL      base do backend (ex: https://backend.ieadpg.org)
  CAPTIVE_AGENT_KEY      mesma chave do .env do backend (header X-Agent-Key)
  CAPTIVE_AGENT_SECRET   mesmo segredo HMAC do backend (valida credenciais)
  CAPTIVE_LISTEN_HOST    host do listener de push       (default 0.0.0.0)
  CAPTIVE_LISTEN_PORT    porta do listener de push      (default 8899)
  CAPTIVE_POLL_INTERVAL  segundos entre polls           (default 10)
  RELEASE_CMD            comando de liberação; "{mac}" é substituído.
                         ex UniFi:    ver README (unifi-authorize)
                         ex iptables: iptables -t mangle -D CAPTIVE -m mac \
                                      --mac-source {mac} -j DROP
  BLOCK_CMD              comando inverso pro accounting-stop (opcional).

Uso:
  python3 agent.py run                       # listener de push + polling
  python3 agent.py session-start <mac>       # dispositivo associou
  python3 agent.py session-stop  <mac>       # accounting-stop
  python3 agent.py ping                      # testa o vínculo com a nuvem
"""

import base64
import hashlib
import hmac
import json
import os
import shlex
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CLOUD_URL = os.environ.get("CAPTIVE_CLOUD_URL", "http://localhost:8000").rstrip("/")
AGENT_KEY = os.environ.get("CAPTIVE_AGENT_KEY", "")
AGENT_SECRET = os.environ.get("CAPTIVE_AGENT_SECRET", "").encode()
LISTEN_HOST = os.environ.get("CAPTIVE_LISTEN_HOST", "0.0.0.0")
LISTEN_PORT = int(os.environ.get("CAPTIVE_LISTEN_PORT", "8899"))
POLL_INTERVAL = int(os.environ.get("CAPTIVE_POLL_INTERVAL", "10"))
RELEASE_CMD = os.environ.get("RELEASE_CMD", "")
BLOCK_CMD = os.environ.get("BLOCK_CMD", "")

APPLIED = set()  # credenciais já aplicadas (idempotência do push + poll)


def log(tag, message):
    stamp = time.strftime("%H:%M:%S")
    print(f"{stamp} [{tag:^9}] {message}", flush=True)


# ---------------------------------------------------------------------------
# HTTP nuvem
# ---------------------------------------------------------------------------


def cloud(method, path, payload=None):
    url = f"{CLOUD_URL}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "X-Agent-Key": AGENT_KEY,
            # sem User-Agent próprio o Cloudflare barra a assinatura do urllib
            # e devolve 403 (erro 1010) em toda chamada à nuvem
            "User-Agent": "IEADPG-CaptiveAgent/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, json.loads(response.read() or b"{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        return exc.code, {"error": body}
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return 0, {"error": str(exc)}


# ---------------------------------------------------------------------------
# Credencial (mesmo formato de apps/captive/services/grants.py)
# ---------------------------------------------------------------------------


def verify_credential(credential):
    """Valida ``b64(payload).hmac`` e devolve o payload {mac, sid, exp}."""

    try:
        encoded, signature = credential.rsplit(".", 1)
        payload_bytes = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
    except (ValueError, TypeError):
        return None
    expected = hmac.new(AGENT_SECRET, payload_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return None
    payload = json.loads(payload_bytes)
    if payload.get("exp", 0) < time.time():
        return None
    return payload


# ---------------------------------------------------------------------------
# Liberação no controlador
# ---------------------------------------------------------------------------


def run_hook(template, mac):
    if not template:
        log("HOOK", f"RELEASE_CMD não configurado — simulei a liberação de {mac}")
        return True
    command = template.replace("{mac}", mac)
    result = subprocess.run(shlex.split(command), capture_output=True, text=True)
    if result.returncode != 0:
        log("HOOK", f"comando falhou ({result.returncode}): {result.stderr.strip()}")
        return False
    return True


def apply_grant(grant):
    """Valida a credencial, libera o MAC no controlador e dá o ack na nuvem."""

    credential = grant.get("credential", "")
    if credential in APPLIED:
        return True
    payload = verify_credential(credential)
    if payload is None:
        log("GRANT", f"credencial inválida/expirada pra {grant.get('mac')} — ignorada")
        return False
    mac = payload["mac"]
    if not run_hook(RELEASE_CMD, mac):
        return False
    status, body = cloud("POST", "/portal/agent/grants/ack", {"credential": credential})
    if status == 200:
        APPLIED.add(credential)
        log("GRANT ✓", f"{mac} liberado no controlador · ack confirmado na nuvem")
        return True
    log("GRANT", f"ack falhou ({status}): {body}")
    return False


# ---------------------------------------------------------------------------
# Push listener (nuvem → agente)
# ---------------------------------------------------------------------------


class PushHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # silencia o log default do http.server
        pass

    def do_POST(self):
        if self.path.rstrip("/") != "/grant":
            self.send_response(404)
            self.end_headers()
            return
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        signature = self.headers.get("X-Captive-Signature", "")
        expected = hmac.new(AGENT_SECRET, body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            log("PUSH", "assinatura HMAC inválida — push rejeitado")
            self.send_response(403)
            self.end_headers()
            return
        grant = json.loads(body)
        ok = apply_grant(grant)
        self.send_response(200 if ok else 500)
        self.end_headers()
        self.wfile.write(b'{"applied": %s}' % (b"true" if ok else b"false"))


def poll_loop():
    while True:
        status, body = cloud("GET", "/portal/agent/grants")
        if status == 200:
            for grant in body.get("grants", []):
                apply_grant(grant)
        elif status != 0:
            log("POLL", f"erro {status}: {body}")
        time.sleep(POLL_INTERVAL)


# ---------------------------------------------------------------------------
# Comandos
# ---------------------------------------------------------------------------


def cmd_run():
    if not AGENT_KEY or not AGENT_SECRET:
        log("BOOT", "defina CAPTIVE_AGENT_KEY e CAPTIVE_AGENT_SECRET antes de rodar")
        sys.exit(1)
    log("BOOT", f"nuvem={CLOUD_URL} · push em http://{LISTEN_HOST}:{LISTEN_PORT}/grant · poll {POLL_INTERVAL}s")
    threading.Thread(target=poll_loop, daemon=True).start()
    server = ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), PushHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("BOOT", "encerrando")


def cmd_session_start(mac):
    status, body = cloud("POST", "/portal/session/start", {"mac": mac})
    if status != 200:
        log("CONN", f"erro {status}: {body}")
        sys.exit(1)
    if body.get("authorized"):
        log("CONN", f"{body['mac']} → MAC vinculado · liberando direto")
        apply_grant(body)
    else:
        log("CONN", f"{body['mac']} desconhecido → redirect captive portal")
        print(body["portal_url"])


def cmd_session_stop(mac):
    status, body = cloud("POST", "/portal/session/stop", {"mac": mac})
    log("DISC", f"{mac} · {status} · {body}")
    if BLOCK_CMD:
        run_hook(BLOCK_CMD, mac)


def cmd_ping():
    status, body = cloud("GET", "/portal/agent/ping")
    log("PING", f"{status} · {body}")
    sys.exit(0 if status == 200 else 1)


def main():
    commands = {
        "run": lambda: cmd_run(),
        "ping": lambda: cmd_ping(),
    }
    if len(sys.argv) >= 3 and sys.argv[1] == "session-start":
        return cmd_session_start(sys.argv[2])
    if len(sys.argv) >= 3 and sys.argv[1] == "session-stop":
        return cmd_session_stop(sys.argv[2])
    if len(sys.argv) >= 2 and sys.argv[1] in commands:
        return commands[sys.argv[1]]()
    print(__doc__)
    sys.exit(64)


if __name__ == "__main__":
    main()
