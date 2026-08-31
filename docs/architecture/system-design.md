# 🏛️ V7M Architecture & System Design

Este documento reflete a arquitetura real do ecossistema V7M, extraída diretamente do código-fonte e das conexões de rede em tempo de execução.

---

## 🗺️ Mapa de Fluxo de Dados

```mermaid
flowchart TD
    subgraph Public["🌐 Tráfego Público & Usuários (Cloudflare & NPM)"]
        LP_Aluno["Landing Supletivo<br>(Astro 6 - Cloudflare Pages)"]
        LP_Prom["Landing Promotor<br>(Astro 6 - Cloudflare Pages)"]
        App_Aluno["App Supletivo<br>(Next.js 16) :3020"]
        Portal_Unificado["Portal V7M Unificado<br>(Next.js 16 - RFC 002) :3003<br>Promotor · Hub · Admin"]
    end

    subgraph Internal_Proxy["🔄 Next.js Rewrites / Proxy"]
        App_Aluno -->|/api/*| Backend
        Portal_Unificado -->|/api/*| Backend
        LP_Aluno -->|GET /pricing| Backend
    end

    subgraph Core_Services["⚙️ Serviços Principais (CT 150)"]
        Backend["services/backend<br>(Django 5.2 Ninja) :8001<br>API Pública via NPM"]
        QCluster_Main["Backend QCluster<br>(Async Workers)"]
        QCluster_Slow["Backend QCluster Slow<br>(AI & OCR Workers)"]
    end

    subgraph Internal_Messaging["🔒 Mensageria Isolada (LAN Interna / Sem Exposição WAN)"]
        Notify["services/notify<br>(Django Ninja + HTMX) :8000"]
        Notify_Worker["Notify QCluster<br>(Dispatch Workers)"]
        EvoGo["Evolution API Go :4000<br>(WhatsApp Gateway)"]
    end

    subgraph Data_Storage["💾 Persistência & Cache"]
        Neon[("Neon Cloud Postgres<br>(Lakebase Serverless)<br>dbs: backend, notify")]
        Redis[("Redis 7.4 :6380<br>Cache & Broker")]
    end

    subgraph External_Integrations["🔌 Provedores Externos"]
        Asaas["Asaas Gateway<br>(Pix & Cartão)"]
        OmniRoute["OmniRoute AI :35<br>(LLM / OCR / TTS)"]
        SMTP["Stalwart Mail Server<br>(E-mails Transacionais)"]
    end

    Backend -->|DATABASE_URL / UNPOOLED| Neon
    Backend --> Redis
    Backend -->|SDK Push Event / LAN| Notify
    Backend --> Asaas
    Backend --> OmniRoute
    
    QCluster_Main --> Neon
    QCluster_Slow --> OmniRoute

    Notify -->|DATABASE_URL / UNPOOLED| Neon
    Notify --> Redis
    Notify_Worker --> EvoGo
    Notify_Worker --> SMTP
    Notify_Worker --> OmniRoute
```

---

## 🔒 Modelo de Segurança & Isolamento de Redes

1. **Eliminação de CORS & Mixed-Content**:
   - Os navegadores dos usuários comunicam-se estritamente com as portas das aplicações Next.js (`/api/*` e `/media/*`).
   - O Next.js atua como proxy reverso interno apontando para o upstream `backend-web:8000`.
   - Nenhuma chave secreta (`SECRET_KEY`, `ASAAS_API_KEY`, `NOTIFY_API_KEY`) é exposta ao client.

2. **Isolamento Rígido de Mensageria (Zero Exposição Pública)**:
   - **Notify Server (`services/notify` :8000)** e **Evolution GO (`evoapicloud` :4000)** são estritamente isolados na rede interna LAN Proxmox (`10.0.1.0/24`) e bridge Docker `v7m_network`.
   - Nenhum tráfego externo ou regra de Nginx Proxy Manager direciona requisições da WAN para essas portas. Toda interação de mensageria é consumida internamente pelo backend ou acessada via VPN/Tailscale para gestão técnica.

2. **Isolamento de Bancos de Dados & Neon Cloud Serverless**:
   - A persistência é desacoplada da infraestrutura local de computação e operada no **Neon Cloud Postgres**:
     - `backend`: Usuários, leads, candidatos, matrículas, pagamentos, polos e auditoria.
     - `notify`: Contas, instâncias, templates de canal, disparos, logs de envio e supressões.
     - `evogo_auth` / `evogo_users`: Sessões de autenticação do Evolution Go.
   - Ambas as aplicações Django utilizam conexões segregadas: **Pooled** (via PgBouncer em `DATABASE_URL`) para tráfego transacional e **Unpooled / Direct** (`DATABASE_URL_UNPOOLED`) para migrações DDL.


3. **Validação de Documentos & KYC com IA**:
   - O upload de RG é classificado e extraído no backend via OCR assíncrono.
   - A selfie passa por verificação de vivacidade (liveness check) e comparação facial com o documento enviado.
   - Qualquer pendência bloqueia o funil e aciona notificação para o gestor do polo ou coordenador.

---

## 📦 Pacotes Compartilhados (`packages/`)

- **`@v7m/api-client`**:
  - Tipagem TypeScript estrita e cliente `openapi-fetch` gerado automaticamente a partir das rotas da API Django Ninja (`pnpm --filter @v7m/api-client codegen`).
- **`@v7m/ui`**:
  - Biblioteca compartilhada de componentes (botões, cards, formulários, modais, câmera de captura de selfie/documento) e sistema de temas CSS por tokens.
- **`@v7m/tsconfig`**:
  - Configurações base de TypeScript reutilizáveis (`base.json`, `nextjs.json`, `react.json`, `node.json`).
- **`@v7m/eslint-config`**:
  - Regras compartilhadas de ESLint v9.
