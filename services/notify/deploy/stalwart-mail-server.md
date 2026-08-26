# Stalwart Mail Server — Documentação e Integração API

Documentação do servidor de e-mail dedicado rodando na VPS interna (`10.0.1.20`).

---

## 1. Dados do Servidor

* **Host / IP**: `10.0.1.20` (Hostname: `mail.v7m.org`)
* **Software**: Stalwart Mail Server `0.16.18` (all-in-one escrito em Rust)
* **Serviço systemd**: `stalwart.service`
* **Diretório de Configuração**: `/etc/stalwart/` (`config.json`, `stalwart.env`)
* **Banco de Dados**: RocksDB em `/var/lib/stalwart/`
* **Logs**: `/var/log/stalwart/stalwart.YYYY-MM-DD`
* **Domínios Gerenciados**: `v7m.org`, `maestri.group`, `ieadpg.org`
* **DKIM**: Ativo e publicado no DNS para todos os domínios (RSA + Ed25519)

---

## 2. Portas e Protocolos

| Protocolo | Porta | Segurança / TLS | Descrição |
| :--- | :--- | :--- | :--- |
| **SMTP** | `25` | STARTTLS opcional | Recepção de e-mails de outros servidores MX |
| **SMTP Submission** | `587` | STARTTLS obrigatório + Auth | Envio autenticado de mensagens por clientes e aplicações |
| **SMTPS** | `465` | Implicit TLS | Envio com TLS direto |
| **IMAPS** | `993` | Implicit TLS | Leitura e sincronização de caixas de entrada |
| **POP3S** | `995` | Implicit TLS | Download de mensagens |
| **ManageSieve** | `4190` | TLS | Filtros e regras de processamento |
| **HTTP / JMAP API** | `8080` | HTTP / Proxy reverso | JMAP API, REST API e Web Admin |
| **HTTPS / JMAP API** | `443` | TLS (`mail.v7m.org`) | JMAP API, WebSockets e Web Portals |

---

## 3. Contas e Credenciais Salvas (`/root/stalwart-*-credentials`)

| E-mail | Usuário | Senha | Account ID (JMAP) | Perfil / Uso |
| :--- | :--- | :--- | :---: | :--- |
| `notify@v7m.org` | `notify` | `Notify2026!#Api` | `m` | Conta de serviço para APIs e notificações |
| `ceo@v7m.org` | `ceo` | `Vvm1993!))#` | `i` | Conta principal administrativa (com aliases) |
| `amalia@ieadpg.org` | `amalia` | `Vvm1993!))#` | `j` | Conta IEADPG |
| `codex@maestri.group` | `codex` | `f3e585e12b2447b0f63ac12a8d74c8a1b2da` | `g` | Conta de automação Maestri Group |

---

## 4. Integração com a API JMAP (RFC 8620 / RFC 8621)

A API JMAP é a forma recomendada e de alta performance para envio, leitura, gerenciamento de caixas e upload de anexos via HTTP/JSON.

### 4.1 Descoberta de Sessão (`GET /jmap/session`)

```bash
curl -s -u "notify@v7m.org:Notify2026!#Api" http://10.0.1.20:8080/jmap/session
```

### 4.2 Envio de E-mail com HTML e Texto Simples

**Endpoint**: `POST http://10.0.1.20:8080/jmap/`  
**Header**: `Authorization: Basic <base64>`, `Content-Type: application/json`

```json
{
  "using": [
    "urn:ietf:params:jmap:core",
    "urn:ietf:params:jmap:mail",
    "urn:ietf:params:jmap:submission"
  ],
  "methodCalls": [
    [
      "Email/set",
      {
        "accountId": "m",
        "create": {
          "msg1": {
            "mailboxIds": { "e": true },
            "from": [{ "name": "Notify Service", "email": "notify@v7m.org" }],
            "to": [{ "name": "Destinatario", "email": "destino@exemplo.com" }],
            "subject": "Notificacao do Sistema",
            "bodyValues": {
              "txt": { "value": "Texto simples da notificacao." },
              "html": { "value": "<h1>Notificacao</h1><p>Texto formatado.</p>" }
            },
            "textBody": [{ "partId": "txt", "type": "text/plain" }],
            "htmlBody": [{ "partId": "html", "type": "text/html" }]
          }
        }
      },
      "passo1"
    ],
    [
      "EmailSubmission/set",
      {
        "accountId": "m",
        "create": {
          "sub1": {
            "emailId": "#msg1",
            "identityId": "a",
            "envelope": {
              "mailFrom": { "email": "notify@v7m.org" },
              "rcptTo": [{ "email": "destino@exemplo.com" }]
            }
          }
        }
      },
      "passo2"
    ]
  ]
}
```

### 4.3 Upload de Anexos

* **Endpoint**: `POST http://10.0.1.20:8080/jmap/upload/{accountId}/`
* **Body**: Conteúdo binário do arquivo
* **Header**: `Content-Type: <mimetype>`
* **Retorno**: `{"accountId": "...", "blobId": "...", "type": "...", "size": ...}`

---

## 5. Ferramentas e Scripts de Teste no Servidor

* **CLI Administrativa**: `/root/.cargo/bin/stalwart-cli`
  * Listar contas: `stalwart-cli --url http://127.0.0.1:8080 --user ceo@v7m.org --password 'Vvm1993!))#' query account`
  * Listar domínios: `stalwart-cli ... query domain`
* **Suíte Completa de Testes**: `/root/test-stalwart-suite.py`
  * Executa testes de autenticação em todos os protocolos, caixas, uploads de anexos e despacho ponta a ponta.
  * Executar: `python3 /root/test-stalwart-suite.py`
