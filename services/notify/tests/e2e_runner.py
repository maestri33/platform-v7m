import json
import time
import urllib.request

base = "http://127.0.0.1:8000"

def get(path):
    req = urllib.request.Request(base + path)
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status, r.read().decode("utf-8")

def post_json(path, data):
    req = urllib.request.Request(
        base + path,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, json.loads(r.read().decode("utf-8"))

def run_all_e2e():
    print("================================================================")
    print("           NOTIFY SERVER — TESTES E2E PONTA A PONTA             ")
    print("================================================================\n")

    # 1. Health & Status
    print("1. [E2E] Health & Readiness:")
    st, res = get("/v1/health")
    print(f"   [OK] GET /v1/health -> HTTP {st}: {res.strip()}")
    assert st == 200

    # 2. Rotas do Dashboard e Frontend
    print("\n2. [E2E] Páginas do Dashboard Operacional & OpenAPI:")
    pages = [
        ("/", "Visão Geral"),
        ("/dashboard/whatsapp/?app=default", "WhatsApp Area"),
        ("/dashboard/email/?app=default", "E-mail Area"),
        ("/dashboard/messages/?app=default", "Outbound Messages"),
        ("/dashboard/inbox/?app=default", "Inbound Inbox"),
        ("/dashboard/webhooks/?app=default", "Webhooks Live Stream"),
        ("/dashboard/webhook/stream", "Webhooks Stream Partial"),
        ("/dashboard/settings/?app=default", "Settings Area"),
        ("/dashboard/setup/?app=default", "Setup Wizard"),
        ("/docs", "Swagger / OpenAPI Docs"),
    ]
    for path, name in pages:
        st, html = get(path)
        assert st == 200, f"Falha na página {path}"
        print(f"   [OK] GET {path:<38} -> HTTP {st} ({len(html):>6} bytes) [{name}]")

    # 3. Servidor MCP JSON-RPC
    print("\n3. [E2E] Servidor MCP JSON-RPC 2.0 (Agentes de IA):")
    st, res_init = post_json("/mcp", {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "e2e-auditor", "version": "1.0"}
        }
    })
    assert st == 200
    server_name = res_init.get("result", {}).get("serverInfo", {}).get("name")
    print(f"   [OK] POST /mcp [initialize]      -> HTTP {st} (Server: {server_name})")

    st, res_tools = post_json("/mcp", {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    })
    assert st == 200
    tools = [t["name"] for t in res_tools.get("result", {}).get("tools", [])]
    print(f"   [OK] POST /mcp [tools/list]      -> HTTP {st} (Total: {len(tools)} ferramentas disponíveis)")
    assert len(tools) >= 9

    st, res_call = post_json("/mcp", {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {"name": "notify_channels", "arguments": {"account_id": "default"}}
    })
    assert st == 200
    print(f"   [OK] POST /mcp [tools/call]      -> HTTP {st} (notify_channels executado com sucesso)")

    # 4. Envio Real via POST /notify (WhatsApp + IA OmniRouter)
    print("\n4. [E2E] Envio Real de Mensagem via POST /notify (WhatsApp + IA):")
    notif_data = {
        "content": "Notificação de teste automatizado E2E Notify Server v7.2.",
        "account_id": "default",
        "whatsapp": "5543996648750",
        "options": {
            "run_sync": True,
            "title": "Suíte E2E"
        }
    }
    st, res_notif = post_json("/notify", notif_data)
    assert st == 200
    ext_id = res_notif.get("external_id")
    print(f"   [OK] POST /notify [Texto + IA]   -> HTTP {st} (UUID: {ext_id}, Canais: {res_notif.get('channels')})")

    # 5. Envio Rico: Pix Button
    print("\n5. [E2E] Envio de Formato Rico — Botão Pix Nativo:")
    pix_data = {
        "content": "Cobrança de mensalidade gerada com sucesso.",
        "account_id": "default",
        "whatsapp": "5543996648750",
        "options": {
            "run_sync": True,
            "title": "Mensalidade V7M",
            "pix": {
                "key": "financeiro@v7m.org",
                "key_type": "email",
                "name": "V7M Educacional",
                "label": "Copiar Chave Pix"
            }
        }
    }
    st, res_pix = post_json("/notify", pix_data)
    assert st == 200
    print(f"   [OK] POST /notify [Pix Button]   -> HTTP {st} (UUID: {res_pix.get('external_id')})")

    # 6. Envio Rico: Enquete (Poll)
    print("\n6. [E2E] Envio de Formato Rico — Enquete Interativa (Poll):")
    poll_data = {
        "content": "Avaliação de Atendimento",
        "account_id": "default",
        "whatsapp": "5543996648750",
        "options": {
            "run_sync": True,
            "poll": {
                "question": "Como você avalia a estabilidade do sistema?",
                "options": ["Excelente", "Muito Boa", "Regular"],
                "selectable_count": 1
            }
        }
    }
    st, res_poll = post_json("/notify", poll_data)
    assert st == 200
    print(f"   [OK] POST /notify [Poll]         -> HTTP {st} (UUID: {res_poll.get('external_id')})")

    # 7. Webhook de Status de Entrega (Evolution GO RECEIPT)
    print("\n7. [E2E] Webhook Ingestion & Monotonic Delivery State (RECEIPT):")
    wh_receipt = {
        "event": "RECEIPT",
        "instance": "default",
        "data": {
            "Type": "read",
            "MessageIDs": ["E2E_TEST_RECEIPT_001"]
        }
    }
    st, res_wh = post_json("/v1/webhook/evolution/default", wh_receipt)
    assert st == 200
    print(f"   [OK] POST /v1/webhook [RECEIPT]  -> HTTP {st} (Handled: {res_wh.get('handled')})")

    print("\n================================================================")
    print("   [OK] RESULTADO: TODOS OS TESTES E2E FORAM APROVADOS (100%)      ")
    print("================================================================")

if __name__ == "__main__":
    run_all_e2e()
