import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://127.0.0.1:8000"
PHONE = "5543996648750"
EMAIL = "victormaestri@gmail.com"
ACCOUNT = "test"

def request(method, path, data=None):
    url = BASE_URL + path
    hdrs = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_body = resp.read().decode("utf-8")
            try:
                return resp.status, json.loads(resp_body)
            except Exception:
                return resp.status, resp_body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body
    except Exception as e:
        return 0, str(e)

def run():
    print("=" * 70)
    print("       NOTIFY SERVER — TESTE DE PONTA A PONTA COM DADOS REAIS       ")
    print("=" * 70)
    print(f"Alvo:          {BASE_URL}")
    print(f"Conta/Tenant:  {ACCOUNT}")
    print(f"WhatsApp Real: {PHONE}")
    print(f"E-mail Real:   {EMAIL}")
    print("-" * 70)

    # 1. Health & Readiness
    print("\n[1/7] Verificando Integridade e Prontidão do Sistema...")
    st, res = request("GET", "/v1/health")
    print(f"  GET /v1/health -> HTTP {st} | {res}")
    st, res = request("GET", "/v1/ready")
    services = res.get("services", {}) if isinstance(res, dict) else {}
    print(f"  GET /v1/ready  -> HTTP {st} | Serviços: {services}")

    # 2. Phone Check (WhatsApp)
    print(f"\n[2/7] Verificando existência de WhatsApp para {PHONE}...")
    st, res = request("POST", "/v1/phone/check", {"numbers": [PHONE], "account_id": ACCOUNT})
    print(f"  POST /v1/phone/check -> HTTP {st} | Resultado: {res}")

    # 3. WhatsApp + IA (POST /notify)
    print("\n[3/7] Enviando Mensagem de Texto com Adaptação de IA via WhatsApp...")
    st, res = request("POST", "/notify", {
        "content": "Olá Victor! Teste automatizado oficial do Notify Server v7.2 com IA.",
        "account_id": ACCOUNT,
        "whatsapp": PHONE,
        "options": {"run_sync": True, "title": "Teste E2E Real", "caller": "live-e2e"}
    })
    print(f"  POST /notify (WhatsApp + IA) -> HTTP {st} | Retorno: {res}")
    if isinstance(res, dict) and "external_id" in res:
        ext = res["external_id"]
        time.sleep(0.5)
        st_n, res_n = request("GET", f"/v1/notifications/{ext}?account_id={ACCOUNT}")
        print(f"  -> Status DB: {res_n.get('whatsapp_status')} | Erro: {res_n.get('whatsapp_error') or 'nenhum'}")

    # 4. Botão Pix Nativo
    print("\n[4/7] Enviando Recurso Rico: Botão Pix Nativo via WhatsApp...")
    st, res = request("POST", "/notify", {
        "content": "Fatura de mensalidade gerada com sucesso.",
        "account_id": ACCOUNT,
        "whatsapp": PHONE,
        "options": {
            "run_sync": True,
            "title": "Cobrança V7M",
            "caller": "live-e2e",
            "pix": {
                "key": "financeiro@v7m.org",
                "key_type": "email",
                "name": "V7M Educacional",
                "label": "Copiar Chave Pix"
            }
        }
    })
    print(f"  POST /notify (Botão Pix) -> HTTP {st} | Retorno: {res}")
    if isinstance(res, dict) and "external_id" in res:
        ext = res["external_id"]
        time.sleep(0.5)
        st_n, res_n = request("GET", f"/v1/notifications/{ext}?account_id={ACCOUNT}")
        print(f"  -> Status DB: {res_n.get('whatsapp_status')} | Erro: {res_n.get('whatsapp_error') or 'nenhum'}")

    # 5. Enquete Interativa (Poll)
    print("\n[5/7] Enviando Recurso Rico: Enquete Interativa (Poll) via WhatsApp...")
    st, res = request("POST", "/notify", {
        "content": "Pesquisa de Qualidade",
        "account_id": ACCOUNT,
        "whatsapp": PHONE,
        "options": {
            "run_sync": True,
            "caller": "live-e2e",
            "poll": {
                "question": "Como você avalia a estabilidade do Notify Server?",
                "options": ["10 - Excelente", "9 - Muito Boa", "8 - Regular"],
                "selectable_count": 1
            }
        }
    })
    print(f"  POST /notify (Poll) -> HTTP {st} | Retorno: {res}")
    if isinstance(res, dict) and "external_id" in res:
        ext = res["external_id"]
        time.sleep(0.5)
        st_n, res_n = request("GET", f"/v1/notifications/{ext}?account_id={ACCOUNT}")
        print(f"  -> Status DB: {res_n.get('whatsapp_status')} | Erro: {res_n.get('whatsapp_error') or 'nenhum'}")

    # 6. E-mail Real Stalwart (POST /notify)
    print(f"\n[6/7] Enviando E-mail Real para {EMAIL} via Stalwart SMTP 587...")
    st, res = request("POST", "/notify", {
        "content": "Prezado Victor,\n\nEste é um e-mail de teste de entrega real enviado pelo **Notify Server** utilizando autenticação segura SMTP com STARTTLS através do Stalwart Mail Server.\n\nTodos os canais estão operando em regime de alta disponibilidade.",
        "account_id": ACCOUNT,
        "email": EMAIL,
        "options": {
            "title": "Confirmação de Entrega Ponta a Ponta",
            "subject": "🔔 Notify Server — Teste Oficial de Entrega Real",
            "run_sync": True,
            "caller": "live-e2e"
        }
    })
    print(f"  POST /notify (E-mail Stalwart) -> HTTP {st} | Retorno: {res}")
    if isinstance(res, dict) and "external_id" in res:
        ext = res["external_id"]
        time.sleep(0.5)
        st_n, res_n = request("GET", f"/v1/notifications/{ext}?account_id={ACCOUNT}")
        print(f"  -> Status DB: {res_n.get('email_status')} | Erro: {res_n.get('email_error') or 'nenhum'}")

    # 7. Despacho Paralelo Concorrente (WA + E-MAIL)
    print(f"\n[7/7] Enviando Despacho Paralelo (WhatsApp + E-mail) em requisição única...")
    st, res = request("POST", "/notify", {
        "content": "Notificação simultânea multicanal de homologação concluída com sucesso.",
        "account_id": ACCOUNT,
        "whatsapp": PHONE,
        "email": EMAIL,
        "options": {
            "title": "Homologação Multicanal",
            "subject": "🚀 Notify Server — Homologação Multicanal Concluída",
            "run_sync": True,
            "caller": "live-e2e"
        }
    })
    channels = res.get("channels") if isinstance(res, dict) else ""
    print(f"  POST /notify (Ambos) -> HTTP {st} | Canais: {channels}")
    if isinstance(res, dict) and "external_id" in res:
        ext = res["external_id"]
        time.sleep(0.5)
        st_n, res_n = request("GET", f"/v1/notifications/{ext}?account_id={ACCOUNT}")
        print(f"  -> Status DB: WA={res_n.get('whatsapp_status')} | E-mail={res_n.get('email_status')}")

    print("\n" + "=" * 70)
    print("       RESULTADO: EXECUÇÃO COMPLETA DA BATERIA DE TESTES E2E        ")
    print("=" * 70)

if __name__ == "__main__":
    run()
