# 🛡️ Relatório Canônico de Auditoria de Produção V7M

Data da Execução: **31 de Agosto de 2026**
Ambiente: **Produção (QG Central V7M / Proxmox Cluster)**
Orquestrador: **Orca ADE + Hermes Agent**

---

## 📊 Resumo Executivo da Auditoria

| Camada Auditada | Testes Realizados | Status | Evidência Principal |
| :--- | :---: | :---: | :--- |
| **Tier 1: Core Host CT 150 (`10.0.1.50`)** | 6 | **PASS (100%)** | 10 containers ativos, 0 legados, 6.7GB RAM livres |
| **Tier 2: Ingress Proxy CT 110 (`10.0.1.10`)** | 2 | **PASS (100%)** | Nginx syntax ok, rotas RFC 002 (:3003) alinhadas |
| **Tier 3: Cloudflare Edge & WAN** | 8 | **PASS (100%)** | 8/8 domínios respondendo HTTP 200 via SSL |
| **Tier 4: Banco de Dados & Migrações** | 2 | **PASS (100%)** | 100% migrações Django aplicadas (0 pendências) |
| **Tier 5: Serviços & Integrações** | 4 | **PASS (100%)** | Asaas, Notify, Stalwart (587), OmniRoute (2300+ models) |

**Total de Verificações:** 22/22 (100% de Aprovação)

---

## 🔍 Detalhamento por Camada

### 1. Tier 1: Core Host CT 150 (`10.0.1.50`)
- **Recursos do Host:** 1.3 GiB de RAM em uso (5.9 GiB livres / 6.7 GiB disponíveis). Disco com 18% de uso.
- **Topologia Docker Ativa:**
  - `v7m-backend-web` (Porta `8001 -> 8000`)
  - `v7m-backend-qcluster` & `v7m-backend-qcluster-slow` (Workers Assíncronos)
  - `v7m-notify-web` (Porta `8000` - Isolado na LAN)
  - `v7m-notify-worker` (Worker de Despacho)
  - `v7m-evolution-go` (Porta `4000` - Isolado na LAN)
  - `v7m-admin` (Porta `3003` - Portal Unificado RFC 002)
  - `v7m-app-supletivo` (Porta `3000` - Portal do Aluno)
  - `v7m-redis` (Porta `6379`) & `v7m-postgres` (Porta `5432`)
- **Containers Legados:** 0 containers legados em execução (removidos `v7m-app-promotor`, `v7m-hub`, `v7m-landing-promotor`).

### 2. Tier 2: Ingress Proxy CT 110 (`10.0.1.10`)
- **Nginx Syntax:** Teste de configuração aprovado com sucesso (`nginx -t`).
- **Mapeamento de Rotas:**
  - `app.maestri.group` ➔ `10.0.1.50:3003` (Portal Unificado)
  - `admin.maestri.group` ➔ `10.0.1.50:3003` (Portal Unificado)
  - `hub.maestri.group` ➔ `10.0.1.50:3003` (Portal Unificado)
  - `app.supletivo.net.br` ➔ `10.0.1.50:3000` (Portal do Aluno)
  - `api.maestri.group` & `api.supletivo.net.br` ➔ `10.0.1.50:8001` (Backend Django Ninja)

### 3. Tier 3: Cloudflare Edge & Public WAN
- `https://maestri.group` ➔ **HTTP 200** (Cloudflare Pages - Astro 6)
- `https://supletivo.net.br` ➔ **HTTP 200** (Cloudflare Pages - Astro 6)
- `https://app.maestri.group/healthz` ➔ **HTTP 200** (`{"status":"ok"}`)
- `https://admin.maestri.group/healthz` ➔ **HTTP 200** (`{"status":"ok"}`)
- `https://hub.maestri.group/healthz` ➔ **HTTP 200** (`{"status":"ok"}`)
- `https://app.supletivo.net.br/healthz` ➔ **HTTP 200** (`{"status":"ok"}`)
- `https://api.maestri.group/api/v1/health/healthz` ➔ **HTTP 200** (`db: true`, `migrations_pending: 0`)
- `https://api.supletivo.net.br/api/v1/health/healthz` ➔ **HTTP 200** (`db: true`)

### 4. Tier 4: Banco de Dados & Migrações
- **Migrações Django:** Todas as 39 migrações de `users`, migrações de `finance`, `asaas`, `auth`, `biometric`, `core`, `django_q`, `notify` estão 100% aplicadas.
- **Latência de Consulta:** < 1.5ms em consultas no banco de dados.

### 5. Tier 5: Serviços & Integrações
- **Webhook Asaas:** Endpoint `https://api.maestri.group/integrations/asaas/webhook/` ativo e protegido contra chamadas sem token (HTTP 401).
- **Notify Server Subsystems:** `ready: true`, canais WhatsApp (Evolution GO) e Stalwart SMTP operacionais.
- **Stalwart SMTP:** Porta `587` aberta e acessível no CT 120 (`10.0.1.20`).
- **OmniRoute AI Gateway:** Endpoint `http://10.0.1.135/v1/models` ativo com latência de 2.6ms.
