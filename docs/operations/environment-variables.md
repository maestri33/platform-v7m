# 🔐 V7M Environment Variables & Production Specs

Este documento mapeia todas as variáveis de ambiente necessárias para operar o ecossistema em **Sandbox (Local)** e em **Produção**.

---

## 1. `services/backend`

| Variável | Descrição | Exemplo Sandbox | Exemplo Produção |
| :--- | :--- | :--- | :--- |
| `DJANGO_SETTINGS_MODULE` | Módulo de configurações | `core.settings` | `core.settings` |
| `SECRET_KEY` | Chave criptográfica do Django | `dev-docker-v7m-secret-key-32chars` | *Chave forte aleatória de 50+ caracteres* |
| `DEBUG` | Modo depuração | `true` | `false` |
| `ALLOWED_HOSTS` | Hosts permitidos | `*` | `api.maestri.group,api.supletivo.net.br,backend-web` |
| `DATABASE_URL` | Conexão PostgreSQL (Neon Cloud / PgBouncer) | `postgresql://backend:pwd@postgres:5432/backend` | `postgresql://neondb_owner:pwd@ep-spring-unit-ay9jhvxz-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | Conexão PostgreSQL Direta (Migrações DDL) | `postgresql://backend:pwd@postgres:5432/backend` | `postgresql://neondb_owner:pwd@ep-spring-unit-ay9jhvxz.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `EXTERNAL_URL` | URL pública do Backend | `http://backend-web:8000` | `https://api.maestri.group` |
| `FRONTEND_URL` | URL do Portal do Aluno | `http://localhost:3020` | `https://app.supletivo.net.br` |
| `NOTIFY_SERVER_URL` | Endereço do notify-server | `http://notify-web:8000` | `http://notify-web:8000` (rede interna) |
| `NOTIFY_API_KEY` | Chave de autenticação no Notify | `dev_placeholder` | *API Key gerada no Notify* |
| `ASAAS_API_KEY` | Chave da API Asaas (Pix/Cartão) | *(mock ativo em sandbox)* | `$aact_YTU5...` (Token Produção) |
| `ASAAS_WEBHOOK_SECRET` | Token de validação de webhook Asaas | *(não validado em dev)* | *Secret de assinatura Asaas* |
| `CPFHUB_API_KEY` | Consulta na Receita / CPFHub | `dev_dummy` | *Chave real CPFHub* |
| `OMNIROUTE_BASE_URL` | Gateway IA para OCR e Liveness | `http://10.1.30.35/v1` | `http://10.1.30.35/v1` ou OpenAI oficial |
| `OMNIROUTE_API_KEY` | Token de acesso do OmniRoute | `sk-omniroute-default` | *Token seguro OmniRoute* |

---

## 2. `services/notify`

| Variável | Descrição | Exemplo Sandbox | Exemplo Produção |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Conexão PostgreSQL do Notify (Neon Cloud / PgBouncer) | `postgresql://notify:pwd@postgres:5432/notify` | `postgresql://neondb_owner:pwd@ep-spring-unit-ay9jhvxz-pooler.c-5.us-east-2.aws.neon.tech/notify?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | Conexão PostgreSQL Direta do Notify (Migrações DDL) | `postgresql://notify:pwd@postgres:5432/notify` | `postgresql://neondb_owner:pwd@ep-spring-unit-ay9jhvxz.c-5.us-east-2.aws.neon.tech/notify?sslmode=require` |
| `SECRET_KEY` | Chave de segurança do Notify | `notify-local-dev-secret-key` | *Chave forte aleatória* |
| `DEBUG` | Modo depuração | `1` | `0` |
| `EVOLUTION_GO_BASE_URL` | Endereço da Evolution API Go | `http://evolution-go:4000` | `http://evolution-go:4000` |
| `EVOLUTION_GO_API_KEY` | Token de instância do WhatsApp | `notify-local-go-key` | *Token da instância ativa* |

| `OMNIROUTER_URL` | Gateway de TTS e adaptação de texto | `http://10.0.1.35` | `http://10.0.1.35` |

---

## 3. Frontends (`apps/*`)

| App | Variável | Descrição | Valor Padrão / Produção |
| :--- | :--- | :--- | :--- |
| **`supletivo`** | `URL_BACKEND` | Upstream do backend para proxy interno Next.js | `http://backend-web:8000` (Docker) / `http://localhost:8001` (Dev) |
| **`group`** | `URL_BACKEND` | Upstream do backend para proxy interno Next.js | `http://backend-web:8000` (Docker) / `http://localhost:8001` (Dev) |
| **`group`** | `OMNIROUTE_BASE_URL` | Endpoint para CopilotKit e IA | `http://10.0.1.35/v1` |
| **`landing-promotor`** | `PUBLIC_APP_URL` | Destino do CTA de cadastro | `https://app.maestri.group` |
| **`landing-supletivo`** | `PUBLIC_APP_URL` | Destino do CTA de matrícula | `https://app.supletivo.net.br` |
| **`landing-supletivo`** | `PUBLIC_BACKEND_URL` | Origem do preço dinâmico | `https://api.supletivo.net.br` ou `http://localhost:8001` |