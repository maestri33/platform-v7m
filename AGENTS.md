# 🤖 V7M Monorepo — Agent Guidelines (`AGENTS.md`)

Este arquivo define as diretrizes, arquitetura, restrições e comandos canônicos para qualquer agente de IA ou desenvolvedor atuando no monorepo **V7M**.

---

## 🏛️ 1. Visão Geral do Projeto

- **Monorepo**: Gerenciado por **Turborepo 2** e **pnpm workspaces** (`pnpm@10.34.5`).
- **Runtimes**: Node.js `>= 22` e Python `3.12` (gerenciado por `uv`).
- **Branch Principal**: `main` (sincronizada com `https://github.com/maestri33/platform-v7m`).
- **Estratégia de Versionamento**: Sincronizada globalmente (`@changesets/cli` e `pnpm run version:check`).

---

## 🏗️ 2. Estrutura do Monorepo

```text
v7m/
├── apps/                                 # Aplicações Frontend
│   ├── admin/                            # Painel Administrativo Master (Next.js 16 Standalone) [Porta 3003]
│   ├── app-promotor/                     # Portal do Promotor / Afiliados (Next.js 16 Standalone) [Porta 3001]
│   ├── app-supletivo/                    # Portal do Aluno & Matrícula (Next.js 16 Standalone) [Porta 3020 -> 3000]
│   ├── hub/                              # Hub de Liderança Regional & Polos (Next.js 16 Standalone) [Porta 3004 -> 4173]
│   ├── landing-promotor/                 # Landing Page Promotores (Astro 6 Estático) [Porta 3010]
│   └── landing-supletivo/                # Landing Page Venda Supletivo (Astro 6 Estático) [Porta 3011]
├── services/                             # Serviços de Backend & Mensageria
│   ├── backend/                          # API Principal (Django 5.2 + Ninja + QCluster) [Porta 8001 -> 8000]
│   └── notify/                           # Relay WhatsApp Evolution & E-mail (Django Ninja) [Porta 8000]
├── packages/                             # Pacotes e Bibliotecas Compartilhadas
│   ├── api-client/                       # @v7m/api-client (SDK TypeScript tipado gerado da OpenAPI)
│   ├── ui/                               # @v7m/ui (Design System, Tokens CSS e Componentes Radix)
│   ├── tsconfig/                         # @v7m/tsconfig (Presets TypeScript)
│   └── eslint-config/                    # @v7m/eslint-config (Configurações ESLint 9 Flat)
├── tooling/                              # Ferramentas e Auditorias
│   ├── qa-audit/                         # @v7m/qa-audit (Suíte com 9 módulos de Testes A2 / E2E)
│   └── v7m-ops/                          # Ferramentas operacionais e monitoramento
├── docker/                               # Infraestrutura Docker & Inicializadores
│   └── postgres-init/                    # Scripts de bootstrap dos múltiplos bancos Postgres
├── docs/                                 # 📚 FONTE ÚNICA DA VERDADE DOCUMENTAL
│   ├── architecture/                     # Diagramas e design de sistemas
│   ├── deployment/                       # Malha de rede, DNS e Proxmox
│   ├── operations/                       # Dicionário de variáveis de ambiente e runbooks
│   ├── specs/                            # Especificações de negócio dos portais
│   └── testing/                          # Matriz de testes e cobertura
├── .github/workflows/                    # Pipelines de CI/CD
│   ├── ci.yml                            # Validação contínua (Lint, Types, Build, Pytest)
│   └── deploy.yml                        # Deploy Multi-Destino (Cloudflare + GHCR + Neon)
├── AGENTS.md                             # Este guia para agentes de IA
├── CHANGELOG.md                          # Histórico de releases
├── README.md                             # Apresentação do monorepo
└── turbo.json                            # Grafo de tarefas do Turborepo
```

---

## 📜 3. Regras Estritas para Agentes (Invariantes)

1. **Proibido Criar Arquivos `.md` Soltos na Raiz ou Subdiretórios**:
   - Toda e qualquer documentação técnica nova deve ser criada exclusivamente dentro da pasta [`docs/`](./docs/).
   - Na raiz do repositório são permitidos estritamente: `README.md`, `CHANGELOG.md` e `AGENTS.md`.
2. **Blindagem de Segredos & Credenciais**:
   - **NUNCA** rastrear ou comitar arquivos `.env`, `.env.*`, credenciais, senhas, chaves `.pem`/`.key`, bancos SQLite (`*.db`, `*.sqlite3`) ou `.neon`.
   - O `.gitignore` é a lei máxima de segurança.
3. **Gerenciador de Pacotes Único**:
   - Utilize estritamente `pnpm` para o ecossistema JavaScript/TypeScript.
   - **NUNCA** use `npm install`, `npm ci` ou `yarn` na raiz. Nunca comite `package-lock.json`.
4. **Gerenciamento de Python**:
   - Utilize estritamente `uv` para executar tarefas e testes em `services/backend` e `services/notify` (`uv run pytest`).
5. **Topologia Multi-Destino de Deploy**:
   - **Cloudflare Pages**: Apenas as duas landings estáticas Astro (`landing-promotor` e `landing-supletivo`).
   - **Proxmox CT 150 / GHCR Docker**: Os 4 apps Next.js SSR (`admin`, `app-promotor`, `app-supletivo`, `hub`) e os serviços backend (`backend`, `notify`).
   - **Neon Cloud Postgres**: Migrações DDL aplicadas diretamente via conexão unpooled.

---

## ⚡ 4. Comandos Canônicos de Desenvolvimento & Validação

### 📦 Instalação e Grafo
```bash
# Instalar dependências de todos os workspaces
pnpm install --frozen-lockfile

# Checar integridade de versões dos pacotes
pnpm run version:check
```

### 🔍 Qualidade, Tipagem & Linting
```bash
# Validar tipagem TypeScript em todos os 8 pacotes TS
pnpm turbo run check-types

# Executar ESLint em todos os workspaces (deve sair com código 0)
pnpm turbo run lint

# Pipeline rápido de qualidade (Lint + Types)
pnpm turbo run lint check-types
```

### 🏗️ Compilação e Build
```bash
# Compilar todas as 6 aplicações frontend em paralelo
pnpm turbo run build

# Compilar apenas uma aplicação específica
pnpm turbo run build --filter=@v7m/admin
pnpm turbo run build --filter=@v7m/landing-supletivo
```

### 🧪 Testes Automatizados
```bash
# Backend Django Principal (296 testes)
cd services/backend && uv run pytest -v

# Notify WhatsApp & Email (243 testes)
cd services/notify && uv run pytest -v

# Suíte de Auditoria A2 / Resiliência / A11y / E2E
pnpm --filter @v7m/qa-audit run audit
```

### 🐳 Ambiente Docker Local (Sandbox)
```bash
# Subir todos os 14 containers locais (Postgres, Redis, Evolution Go, Notify, Backend, Frontends)
pnpm docker:dev

# Ver logs
pnpm docker:logs

# Encerrar containers
pnpm docker:down
```

---

## 🔄 5. Ciclo de Vida: Issues, Commits Semânticos & Changesets

Para manter rastreabilidade total entre o código, o backlog e os releases de produção:

1. **Abertura de Issue**:
   - Toda nova funcionalidade, refatoração ou correção deve possuir uma **Issue no GitHub** (`#X`).
2. **Resolução & Commit Semântico**:
   - Ao resolver a demanda, o commit deve seguir o padrão *Conventional Commits* e referenciar a issue para fechamento automático:
     - `feat(app-promotor): adicionar filtro de comissões por data (closes #12)`
     - `fix(admin): corrigir tipagem do editor de notificações (closes #15)`
3. **Registro de Mudança (`Changeset`)**:
   - Para mudanças que alteram comportamento ou pacotes, gere uma entrada de changeset:
     ```bash
     pnpm changeset
     ```
   - No texto da mudança, cite a issue resolvida (ex: `Resolves #12`).
4. **Atualização de Versão & CHANGELOG (`Release`)**:
   - Ao fechar um ciclo de releases, a versão global é incrementada sincronizada:
     ```bash
     pnpm run version:bump
     ```
   - O Changeset atualiza automaticamente o [`CHANGELOG.md`](./CHANGELOG.md) vinculando as alterações às issues e tags de release.

---

## 🛡️ 6. Checklist Pré-Commit para Agentes

Antes de propor ou comitar qualquer alteração, o agente deve garantir:
- [ ] `pnpm run version:check` retorna código 0.
- [ ] `pnpm turbo run lint` retorna código 0 (zero erros).
- [ ] `pnpm turbo run check-types` retorna código 0 (zero erros de tipagem).
- [ ] `pnpm turbo run build` gera os artefatos com sucesso.
- [ ] `git commit` referencia a Issue correspondente (`closes #X`).
- [ ] `git status` não contém arquivos `.env`, chaves privadas ou arquivos `.md` soltos fora de `docs/`.

