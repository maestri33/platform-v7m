# V7M Ecosystem: Domain Mesh, SSL/TLS, DNS Routing & Network Security Architecture

> **Documento Canônico de Arquitetura de Rede e Segurança (Issue #3)**  
> **Status:** Ativo / Homologado  
> **Última Atualização:** 2026-08-27  

---

## 1. Visão Geral da Topologia de Rede & Ingress

A malha de rede de produção do ecossistema **V7M / Maestri Group** coordena o tráfego de borda através do Cloudflare Edge (WAF, CDN, DNS Anycast e Pages), roteando conexões seguras para o host Proxmox VE (`pve-v7m`) e distribuindo internamente via Nginx Proxy Manager (NPM - CT 110) para contêineres LXC dedicados e a stack Docker da aplicação.

```text
                                  [ INTERNET ]
                                        │
                         ┌──────────────┴──────────────┐
                         │   Cloudflare Edge (DNS/WAF) │
                         └──────────────┬──────────────┘
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           ▼                                                         ▼
   [ Orange Cloud (Proxied) ]                                [ Grey Cloud (DNS Only) ]
   - app.maestri.group -> NPM :3003                          - mail.maestri.group
   - hub.maestri.group -> NPM :3003                          - webmail.maestri.group
   - admin.maestri.group -> NPM :3003                        - MX / SMTP (portas 25, 465, 587)
   - portal.maestri.group -> NPM :3003                       - IMAPS (porta 993)
   - api.maestri.group -> NPM :8001
   - app.supletivo.net.br -> NPM :3020
   - api.supletivo.net.br -> NPM :8001
   - Cloudflare Pages:
     * maestri.group -> landing-promotor.pages.dev
     * supletivo.net.br -> landing-supletivo.pages.dev
           │                                                         │
           └────────────────────────────┬────────────────────────────┘
                                        ▼
                  Proxmox Host: pve-v7m (WAN: 51.79.77.31 / TS: 100.124.1.92)
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           │                     Internal 10.0.1.0/24                │
           ▼                                                         ▼
    CT 110 (10.0.1.10)                                        CT 120 (10.0.1.20)
    Nginx Proxy Manager                                       Stalwart Mail Server
    [Portas: 80, 443, 81]                                     [Portas: 25, 465, 587, 8080, 993]
           │
           ├────────────────────────────┬────────────────────────────┐
           ▼                            ▼                            ▼
    CT 130 (10.0.1.30)           CT 135 (10.0.1.35)           CT 150 (10.0.1.50)
    Bulwark Webmail              OmniRoute AI Gateway         Docker Host V7M
    [Porta: 3000]                [Porta: 80 (/v1)]            ├── 🌐 Público via NPM:
                                                              │   • Backend API: :8001
                                                              │   • Portal Unificado: :3003
                                                              │   • App Supletivo: :3020
                                                              └── 🔒 LAN Interna (Sem WAN / Fora do NPM):
                                                                  • Notify Server: :8000
                                                                  • Evolution GO: :4000
                                                                  • Redis: :6380, DBs: Neon Cloud
```

---

## 2. Parâmetros de Interfaces e Segmentação de Rede

| Identificador | Tipo | IP / Subrede | Finalidade | Regras de Exposição |
|---|---|---|---|---|
| `pve-v7m (WAN)` | Físico (OVH) | `51.79.77.31` | Interface pública externa do host | **Apenas portas 80, 443, 25, 465, 587 abertas.** Todo o restante bloqueado no firewall. |
| `pve-v7m (Mesh)` | Tailscale | `100.124.1.92` | Rede privada mesh de administração | Acesso restrito a administradores (SSH :22, Proxmox GUI :8006, NPM Admin :81). |
| `Internal Subnet` | Bridge `vmbr1` | `10.0.1.0/24` | Rede interna isolada entre contêineres LXC | Sem roteamento direto para a WAN. Comunicação interna segura. |
| `CT 110` | LXC | `10.0.1.10` | Nginx Proxy Manager (Ingress Invertido) | Recebe portas 80/443 do host e termina SSL / faz proxy pass. |
| `CT 120` | LXC | `10.0.1.20` | Stalwart Mail Server 0.16.18 | Portas de e-mail (25, 465, 587, 993) e API JMAP interna (`:8080`). |
| `CT 130` | LXC | `10.0.1.30` | Bulwark Webmail Client | Porta HTTP interna `:3000` acessível via proxy NPM. |
| `CT 135` | LXC | `10.0.1.35` | OmniRoute AI Gateway v3.8.50 | Gateway interno de LLM/OCR na porta `:80` (Apenas LAN). |
| `CT 150` | LXC | `10.0.1.50` | Host Docker Monorepo V7M | Contêineres de backend, mensageria e frontends Next.js. |

---

## 3. Matriz de Domínios, DNS & Nível de Exposição (12 Domínios)

| # | Domínio / Subdomínio | Destino / Serviço | Tipo Cloudflare | Ingress / Proxy | Nível de Exposição |
|---|---|---|---|---|---|
| 1 | `supletivo.net.br` | Landing Supletivo (Astro 6) | 🟠 Orange (Proxied) | Cloudflare Pages (`landing-supletivo.pages.dev`) | **Público** |
| 2 | `www.supletivo.net.br` | Landing Supletivo (Astro 6) | 🟠 Orange (Proxied) | Cloudflare Pages (`landing-supletivo.pages.dev`) | **Público** |
| 3 | `maestri.group` | Landing Promotor (Astro 6) | 🟠 Orange (Proxied) | Cloudflare Pages (`landing-promotor.pages.dev`) | **Público** |
| 4 | `www.maestri.group` | Landing Promotor (Astro 6) | 🟠 Orange (Proxied) | Cloudflare Pages (`landing-promotor.pages.dev`) | **Público** |
| 5 | `app.supletivo.net.br` | App Aluno & Matrícula (Next.js) | 🟠 Orange (Proxied) | NPM -> CT 150 (`:3020`) | **Público / Autenticado** |
| 6 | `app.maestri.group` | Portal Unificado (RFC 002 - Visão Promotor) | 🟠 Orange (Proxied) | NPM -> CT 150 (`:3003`) | **Autenticado (RBAC)** |
| 7 | `hub.maestri.group` | Portal Unificado (RFC 002 - Visão Polo Hub) | 🟠 Orange (Proxied) | NPM -> CT 150 (`:3003`) | **Autenticado (RBAC)** |
| 8 | `admin.maestri.group` / `portal.maestri.group` | Portal Unificado (RFC 002 - Visão Master) | 🟠 Orange (Proxied) | NPM -> CT 150 (`:3003`) | **Autenticado (Superuser)** |
| 9 | `api.maestri.group` | Backend Django Ninja Principal | 🟠 Orange (Proxied) | NPM -> CT 150 (`:8001`) | **Misto** (Ver Seção 5) |
| 10 | `api.supletivo.net.br` | Backend Django Ninja (Alias) | 🟠 Orange (Proxied) | NPM -> CT 150 (`:8001`) | **Misto** (Ver Seção 5) |
| 11 | `mail.maestri.group` | Stalwart Mail Admin & JMAP API | ⚪ Grey (DNS Only) | NPM -> CT 120 (`:8080`) | **Restrito / Admin** |
| 12 | `webmail.maestri.group` | Bulwark Webmail Interface | ⚪ Grey (DNS Only) | NPM -> CT 130 (`:3000`) | **Autenticado** |

### 🔒 Serviços Estritamente Internos na LAN (Sem Exposição Pública / Fora do NPM)
- **`Notify Server` (`services/notify` :8000)**: Relay de WhatsApp e e-mail. Acessível unicamente na rede interna `10.0.1.0/24` (Docker bridge `v7m_network`). Zero DNS público, zero regra no NPM.
- **`Evolution GO` (`evoapicloud` :4000)**: Gateway WhatsApp. Acessível unicamente pelo container `notify` na rede interna `10.0.1.0/24`. Zero DNS público, zero regra no NPM.

### Erradicação de Registros Obsoletos e Isolamento
- **`job.v7m.org`**: Desacoplado de `51.79.77.31` e totalmente isolado (zero tráfego de produção ativo).
- **Hetzner Legacy Cleanup**: Registros IPv4 A `135.181.216.160` e IPv6 AAAA `2a01:4f9:3a:3925::2` totalmente erradicados do DNS.

---

## 4. Blindagem de Borda, Proxmox Firewall & Isolamento WAN

### 4.1 Política de Firewall WAN (`51.79.77.31`)
Para evitar ataques diretos e contorno do WAF da Cloudflare (*Cloudflare Origin Bypass*), o firewall do Proxmox e do host deve aplicar as seguintes regras rígidas:

### NPM (CT 110) Ingress Routing Table
- `app.maestri.group:80/443` -> `http://10.0.1.50:3003` (Portal Unificado - Visão Promotor) (WebSockets: ON, Block Exploits: ON)
- `hub.maestri.group:80/443` -> `http://10.0.1.50:3003` (Portal Unificado - Visão Liderança Regional) (WebSockets: ON, Block Exploits: ON)
- `admin.maestri.group:80/443` -> `http://10.0.1.50:3003` (Portal Unificado - Visão Master Admin) (WebSockets: ON, Block Exploits: ON)
- `api.maestri.group:80/443` -> `http://10.0.1.50:8001` (WebSockets: ON, Block Exploits: ON)
- `app.supletivo.net.br:80/443` -> `http://10.0.1.50:3020` (WebSockets: ON, Block Exploits: ON)
- `api.supletivo.net.br:80/443` -> `http://10.0.1.50:8001` (WebSockets: ON, Block Exploits: ON)
- `mail.maestri.group:80/443` -> `http://10.0.1.20:8080` (Let's Encrypt SSL, Grey Cloud)
- `webmail.maestri.group:80/443` -> `http://10.0.1.30:3000` (Let's Encrypt SSL, Grey Cloud)

```text
[ REGRAS DE INGRESS WAN 51.79.77.31 ]
1. Portas 80/tcp e 443/tcp (HTTP/HTTPS):
   - Permitir APENAS pacotes originados dos blocos de IP oficiais da Cloudflare.
   - Rejeitar/Descartar tráfego direto de qualquer outro endereço IP na WAN.
2. Portas 25/tcp, 465/tcp, 587/tcp (Protocolos SMTP Mail):
   - Permitir tráfego público direto para operação do Stalwart Mail Server.
3. Todas as demais portas (81, 8006, 4000, 5432, 6379, 6380, 8000, 8001, 8080, 3000-3020):
   - BLOQUEIO TOTAL NA WAN (DROP / REFUSE).
   - Acesso exclusivo via Tailscale (100.124.1.92) ou subrede local 10.0.1.0/24.
```

### 4.2 Lista de Blocos IPv4 Oficiais da Cloudflare (Allowlist)
```text
173.245.48.0/20
103.21.244.0/22
103.22.200.0/22
103.31.4.0/22
141.101.64.0/18
108.162.192.0/18
190.93.240.0/20
188.114.96.0/20
197.234.240.0/22
198.41.128.0/17
162.158.0.0/15
104.16.0.0/13
104.24.0.0/14
172.64.0.0/13
131.0.72.0/22
```

### 4.3 Isolamento Estrito de Serviços Privados (Docker Compose)
No arquivo `docker-compose.yml`, todos os serviços de infraestrutura e mensageria possuem bindings restritos ao loopback (`127.0.0.1`), garantindo que não abram sockets em `0.0.0.0`:
- **Redis**: `"127.0.0.1:${REDIS_PORT:-6380}:6379"`
- **Evolution-Go (WhatsApp)**: `"127.0.0.1:${EVOLUTION_GO_PORT:-4000}:4000"`
- **Notify (Web)**: `"127.0.0.1:${NOTIFY_PORT:-8000}:8000"`
- **Postgres Local**: `"127.0.0.1:${POSTGRES_PORT:-5432}:5432"`

---

## 5. Matriz de Classificação e Proteção de Endpoints da API

Os endpoints expostos pelo backend Django Ninja (`api.maestri.group` / `api.supletivo.net.br`) são divididos em 3 categorias de segurança:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLASSIFICAÇÃO DE ENDPOINTS DA API                        │
├──────────────────────┬───────────────────────────┬──────────────────────────┤
│ 1. PÚBLICOS          │ 2. AUTENTICADOS (RBAC)    │ 3. PRIVADOS / DMZ        │
│ (Sem JWT obrigatório)│ (JWT Bearer RS256)        │ (Server-to-Server)       │
├──────────────────────┼───────────────────────────┼──────────────────────────┤
│ - /health/healthz    │ - /clients/* (aluno)      │ - /tools/leads           │
│ - /clients/pricing   │ - /collaborators/* (promo)│ - /tools/notifications/* │
│ - /clients/auth/*    │ - /leadership/* (polo)    │ - notify:8000/v1/send    │
│ - /webhooks/asaas    │ - /staff/* (superuser)    │ - /media/documents/*     │
└──────────────────────┴───────────────────────────┴──────────────────────────┘
```

### 5.1 Endpoints Públicos (Internet -> Cloudflare WAF -> API)
Expostos abertamente na internet, mas protegidos por salvaguardas ativas contra brute force, scraping e abuso:

| Endpoint | Método | Descrição & Payload | Salvaguarda de Segurança |
|---|---|---|---|
| `/api/v1/health/healthz` | `GET` | Probe de liveness público (status, db, migrations_pending, version) | Resposta higienizada sem stacktraces ou credenciais. |
| `/api/v1/clients/pricing` | `GET` | Catálogo de planos e precificação dinâmica | Leitura pura, cacheável na borda. |
| `/api/v1/clients/referral/{ref}` | `GET` | Consulta do nome do promotor para selo de indicação | Retorno seguro `name=null` caso não encontrado. |
| `/api/v1/clients/auth/register` | `POST` | Cadastro inicial do aluno e criação de checkout | Validação estrita de CPF, paywall e rate limiting. |
| `/api/v1/clients/auth/otp/request` | `POST` | Solicitação de OTP via WhatsApp/SMS | Cooldown de 60s, máximo de 10 requisições/hora por telefone. |
| `/api/v1/clients/auth/otp/verify` | `POST` | Validação de código OTP de 6 dígitos | TTL de 10 min, invalidação após 3 tentativas incorretas. |
| `/api/v1/collaborators/auth/login` | `POST` | Autenticação de promotor/afiliado | Rate limit estrito contra ataques de dicionário. |
| `/integrations/asaas/webhook/` | `POST` | Webhook de pagamentos do gateway Asaas | Validação constante `hmac.compare_digest` do token `asaas-access-token`. |

### 5.2 Endpoints Autenticados por Usuário (RBAC via JWT RS256)
Exigem cabeçalho `Authorization: Bearer <JWT>`. A camada `JWTAuth` valida a chave pública RS256, checa a revogação via `token_version` no banco e aplica gates de papel (`require_roles` / `require_superuser`):

| Grupo / Prefixo | Role Exigida | Exemplos de Operações |
|---|---|---|
| `/api/v1/clients/*` | `student`, `candidate`, `enrollment` | Atualização cadastral, matrícula, upload de documentos, termos de adesão. |
| `/api/v1/collaborators/*` | `promoter`, `veteran` | Painel do afiliado, extrato de comissões, link de indicação, solicitação de saque PIX. |
| `/api/v1/leadership/*` | `coordinator` | Visão geral do polo regional, lista de promotores subordinados, relatórios de conversão. |
| `/api/v1/staff/*` | `superuser` (`is_superuser=True`) | Gestão de usuários, alteração de planos, auditoria financeira, logs avançados de sistema. |
| `/media/documents/*` | Sessão válida do titular ou staff | Gate de mídia privada (`MEDIA_PRIVATE_PREFIXES`) bloqueia acesso a PDFs/selfies sensíveis. |

### 5.3 Endpoints e Serviços Estritamente Privados (Rede Interna / DMZ)
Serviços que **nunca** devem ser invocados diretamente pelo cliente frontend nem expostos na WAN:

| Endpoint / Serviço | Localização | Mecanismo de Proteção |
|---|---|---|
| `/api/v1/tools/leads` | Backend (`:8001`) | **Camada 1**: Header `x-bot-service-token == BOT_SERVICE_SECRET`.<br>**Camada 2**: Whitelist de IP interno `10.0.0.0/8` e `127.0.0.1` (`require_internal_ip`). |
| `/api/v1/tools/notifications/send` | Backend (`:8001`) | Header secreto `BOT_SERVICE_SECRET` + IP interno. |
| `POST /v1/send` | Notify (`:8000`) | Autenticação via `VpnBearerAuth` / chave de API de serviço (`NOTIFY_API_KEY`). |
| `POST /v1/chat/completions` | OmniRoute (`10.0.1.35:80`) | Acessível apenas via LAN para processamento de OCR e IA. |
| `Redis Broker` | Docker (`:6379`) | Binding em `127.0.0.1`, isolado na rede virtual Docker `v7m_network`. |

---

## 6. Cabeçalhos de Segurança HTTP & Políticas de Proteção

Todas as aplicações e landings configuram cabeçalhos de segurança estritos:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
```

---

## 7. Suíte Automatizada de Verificação de Segurança de Rede

Para garantir a conformidade contínua com a arquitetura de segurança, o monorepo conta com uma engine automatizada de testes sem dependências externas:

### Execução via CLI
```bash
# Executar auditoria de segurança em modo local / CI (simulação de malha e validação de regras)
pnpm run test:security:local

# Executar auditoria completa com probes diretos de rede WAN (em ambiente de homologação/produção)
pnpm run test:security

# Executar suíte de auditoria consolidada completa (E2E + Segurança + A11y)
pnpm --filter @v7m/qa-audit run audit
```

### As 7 Camadas de Verificação Automatizada
1. **Tier 1**: DNS Topology & Cloudflare Edge Routing (12 domínios + isolamento de `job.v7m.org`).
2. **Tier 2**: Negociação SSL/TLS 1.3, cadeia de certificados e HSTS Preload.
3. **Tier 3**: Verificação de limites de firewall e acessibilidade de portas na WAN `51.79.77.31` (whitelist vs blacklist).
4. **Tier 4**: Cabeçalhos de segurança HTTP, conformidade CSP e proteção anti-clickjacking.
5. **Tier 5**: Matriz de autorização de endpoints em 3 níveis (Público, RBAC via JWT e Privado DMZ).
6. **Tier 6**: Validação do contrato do probe de saúde pública (`/api/v1/health/healthz`).
7. **Tier 7**: Testes adversariais de injeção (SQLi, XSS, Path Traversal, Overflow) e anonimização de logs (PII Scrubbing).

---

## 8. Interface Contracts & Respostas Canônicas

### Contract: Backend Health Check
- **Endpoint**: `GET /api/v1/health/healthz`
- **Status Code**: `200 OK` (ou `503 Service Unavailable` em falha grave de banco)
- **JSON Schema**:
  ```json
  {
    "status": "ok",
    "version": "0.1.0-alpha.1",
    "db": true,
    "migrations_pending": 0,
    "sha": null,
    "built_at": null
  }
  ```

### Contract: Error Envelopes Padronizados
- **Formato**:
  ```json
  {
    "detail": "Mensagem descritiva e segura do erro.",
    "code": "CODIGO_DO_ERRO"
  }
  ```
- **Códigos Comuns**: `AUTHENTICATION_ERROR` (401), `FORBIDDEN` (403), `RATE_LIMITED` (429), `VALIDATION_ERROR` (422), `NOT_FOUND` (404), `INTERNAL` (500 higienizado sem vazamento de stacktrace).
