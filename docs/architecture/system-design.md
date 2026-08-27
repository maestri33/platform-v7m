# 🏛️ V7M Architecture & System Design

Este documento reflete a arquitetura real do ecossistema V7M, extraída diretamente do código-fonte e das conexões de rede em tempo de execução.

---

## 🗺️ Mapa de Fluxo de Dados

```mermaid
flowchart TD
    subgraph Public["🌐 Tráfego Público & Usuários"]
        LP_Aluno["Landing Supletivo<br>(Astro 6) :3011"]
        LP_Prom["Landing Promotor<br>(Astro 6) :3010"]
        App_Aluno["App Supletivo<br>(Next.js 16) :3020"]
        App_Prom["App Promotor<br>(Next.js 16) :3001"]
        Hub["Hub Liderança<br>(Next.js 16) :3004"]
        Admin["Admin Master<br>(Next.js 16) :3003"]
    end

    subgraph Internal_Proxy["🔄 Next.js Rewrites / Proxy"]
        App_Aluno -->|/api/*| Backend
        App_Prom -->|/api/*| Backend
        Hub -->|/api/*| Backend
        Admin -->|/api/*| Backend
        LP_Aluno -->|GET /pricing| Backend
    end

    subgraph Core_Services["⚙️ Serviços Principais"]
        Backend["services/backend<br>(Django 5.2 Ninja) :8001 / :8000"]
        QCluster_Main["Backend QCluster<br>(Async Workers)"]
        QCluster_Slow["Backend QCluster Slow<br>(AI & OCR Workers)"]
        Notify["services/notify<br>(Django Ninja) :8000"]
        Notify_Worker["Notify QCluster<br>(Dispatch Workers)"]
    end

    subgraph Data_Storage["💾 Persistência & Cache"]
        Neon[("Neon Cloud Postgres<br>(Lakebase Serverless)<br>dbs: backend, notify")]
        Redis[("Redis 7.4<br>Cache & Broker")]
    end

    subgraph External_Integrations["🔌 Provedores & Gateways"]
        EvoGo["Evolution API Go :4000<br>(WhatsApp Gateway)"]
        Asaas["Asaas Gateway<br>(Pix & Cartão)"]
        OmniRoute["OmniRoute AI :35<br>(LLM / OCR / TTS)"]
        SMTP["Mailcow / Stalwart<br>(E-mails Transacionais)"]
    end

    Backend -->|DATABASE_URL / UNPOOLED| Neon
    Backend --> Redis
    Backend -->|SDK Push Event| Notify
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
