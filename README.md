# 🏛️ Maestri.group — Monorepo da Plataforma Educacional & Mensageria

Monorepo de alta performance para o ecossistema educacional **Maestri.group** e **Supletivo Brasil**, gerenciado por **Turborepo** e **pnpm workspaces**, com arquitetura em camadas (Frontends, Serviços Backend/Mensageria, Bibliotecas Compartilhadas e Tooling).

---

## 🏗️ Estrutura do Repositório

```text
v7m/
├── apps/                                 # Aplicações Web (Frontends)
│   ├── group/                            # Portal Maestri.group Unificado (Next.js 16) [Porta 3003] (Promotor, Hub & Admin)
│   ├── supletivo/                        # Portal do Aluno, KYC & Matrícula (Next.js 16) [Porta 3020 -> 3000]
│   ├── landing-promotor/                 # Landing Page de Recrutamento de Promotores (Astro 6) [Cloudflare Pages]
│   └── landing-supletivo/                # Landing Page de Venda do Supletivo (Astro 6) [Cloudflare Pages]
├── services/                             # Serviços de Backend & Mensageria
│   ├── backend/                          # API Principal (Django 5.2 + Ninja + QCluster) [Porta 8001 -> 8000]
│   └── notify/                           # Relay WhatsApp & E-mail [Porta 8000] (LAN Interna / Sem Exposição Pública)
├── packages/                             # Bibliotecas Compartilhadas
│   ├── api-client/                       # @v7m/api-client (SDK OpenAPI TypeScript tipado gerado do Backend)
│   ├── ui/                               # @v7m/ui (Design System, Tokens CSS e Componentes Radix)
│   ├── tsconfig/                         # @v7m/tsconfig (Presets TypeScript)
│   └── eslint-config/                    # @v7m/eslint-config (Regras ESLint v9)
├── tooling/                              # Ferramentas e Auditorias
│   ├── qa-audit/                         # Scripts de Auditoria E2E
│   └── v7m-ops/                          # Monitoramento e Watcher de Containers
├── docker/                               # Infraestrutura Docker
│   ├── postgres-init/                    # Scripts de inicialização dos bancos de dados
│   └── docker-compose.yml                # Orquestrador local com containers integrados
└── .github/workflows/                    # Pipelines de CI/CD
    ├── ci.yml                            # Validação contínua (Lint, Typecheck, Pytest)
    └── deploy.yml                        # Build de imagens Docker e release
```

---

## ⚡ Comandos Rápidos

```bash
# 1. Instalar todas as dependências do monorepo
pnpm install

# 2. Executar compilação de todas as aplicações em paralelo
pnpm build

# 3. Executar suítes de testes dos frontends
pnpm test

# 4. Iniciar ambiente de desenvolvimento
pnpm dev

# 5. Gerar cliente TypeScript OpenAPI a partir do Backend Django Ninja
pnpm --filter @v7m/api-client codegen

# 6. Subir toda a infraestrutura local em Docker Compose
pnpm docker:dev

# 7. Parar a infraestrutura local
pnpm docker:down
```

---

## 🔌 Portas, Serviços e Isolamento de Rede

| Serviço / App | Tecnologia | Porta Host | Porta Container | Exposição / Ingress | Descrição |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`neon-postgres`** | Neon Cloud Postgres | Cloud | Cloud | Cloud Serverless | Bancos gerenciados (`backend`, `notify`, `evolution`) |
| **`postgres` (fallback)**| PostgreSQL 16 Alpine | `5432` | `5432` | LAN Interna | Container sandbox offline (profile: `local`) |
| **`redis`** | Redis 7.4 | `6380` | `6379` | LAN Interna | Cache e filas de mensageria |
| **`evolution-go`** | Evolution API Go | `4000` | `4000` | 🔒 **LAN Interna (Sem WAN)** | Gateway de WhatsApp (isolado antes do proxy) |
| **`notify-web`** | Django Ninja + HTMX | `8000` | `8000` | 🔒 **LAN Interna (Sem WAN)** | Relay de Notificações (isolado antes do proxy) |
| **`backend-web`** | Django Ninja + QCluster | `8001` | `8000` | 🌐 `api.maestri.group` | API Principal do Ecossistema |
| **`portal-group`** | Next.js 16 (RFC 002) | `3003` | `3003` | 🌐 `portal.maestri.group` | Portal Maestri.group Unificado (Promotor, Hub, Admin Master) |
| **`app-supletivo`** | Next.js 16 | `3020` | `3000` | 🌐 `app.supletivo.net.br` | Portal do Aluno & Checkout |
| **`landing-promotor`** | Astro 6 | Cloudflare | `4321` | 🌐 `maestri.group` | LP Recrutamento de Promotores (Cloudflare Pages) |
| **`landing-supletivo`** | Astro 6 | Cloudflare | `4321` | 🌐 `supletivo.net.br` | LP Venda Supletivo Brasil (Cloudflare Pages) |

---


## 🧪 Testes Automatizados

### Backend (`services/backend`)
```bash
cd services/backend
uv run pytest -v
```
*(296 testes unitários e de integração cobrindo autenticação, funil KYC, OCR, selfie liveness e finanças)*

### Notify (`services/notify`)
```bash
cd services/notify
.\.venv\Scripts\pytest.exe -v
```
*(243 testes unitários e de integração cobrindo WhatsApp Evolution GO, Mailcow/SMTP e Django-Q)*

### Frontends & Landings
```bash
pnpm test
```

---

## 📚 Documentação Canônica (`docs/`)

Toda a documentação técnica detalhada do monorepo reside na pasta [`docs/`](./docs/):

- 🏛️ **[Arquitetura & Design de Sistema](./docs/architecture/system-design.md)**: Topologia, diagramas e isolamento de redes.
- 🌐 **[Malha de Rede & DNS](./docs/deployment/network-mesh.md)**: Roteamento Edge Cloudflare, Proxmox e NPM CT 110.
- 🔐 **[Variáveis de Ambiente](./docs/operations/environment-variables.md)**: Dicionário Sandbox vs Produção.
- 📘 **[Runbooks & Operações](./docs/operations/runbooks.md)**: Procedimentos de bootstrap, reset e integrações.
- 🗺️ **[Roadmap & Issues Ativas](./docs/operations/roadmap.md)**: Matriz de issues, critérios de aceitação e tracking.
- 🧪 **[Matriz de Testes](./docs/testing/test-matrix.md)**: Cobertura 4-Tier, suítes E2E e testes adversariais A2.
- 📋 **[Especificações de Portais](./docs/specs/README.md)**: Detalhamento funcional de cada frontend.


