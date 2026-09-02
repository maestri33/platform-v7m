# 🤖 V7M Monorepo — Agent Guidelines (`AGENTS.md`)

Este arquivo define as diretrizes, arquitetura, governança, restrições e comandos canônicos para qualquer agente de IA ou desenvolvedor atuando no monorepo **V7M**.

---

## 🏛️ 1. Visão Geral do Projeto

- **Monorepo**: Gerenciado por **Turborepo 2** e **pnpm workspaces** (`pnpm@10.34.5`).
- **Runtimes**: Node.js `>= 22` e Python `3.12` (gerenciado por `uv`).
- **Branch Principal**: `main` (sincronizada com `https://github.com/maestri33/platform-v7m`).
- **Estratégia de Versionamento**: Sincronizada globalmente / Lockstep via release bot (`release-please` e `pnpm run version:check`).

---

## 🏗️ 2. Estrutura do Monorepo

```text
v7m/
├── apps/                                 # Aplicações Frontend
│   ├── group/                            # Portal V7M Unificado (Next.js 16 Standalone) [Porta 3003] (Promotor, Hub & Admin)
│   ├── supletivo/                        # Portal do Aluno & Matrícula (Next.js 16 Standalone) [Porta 3020 -> 3000]
│   ├── landing-promotor/                 # Landing Page Promotores (Astro 6 Estático) [Cloudflare Pages]
│   └── landing-supletivo/                # Landing Page Venda Supletivo (Astro 6 Estático) [Cloudflare Pages]
├── services/                             # Serviços de Backend & Mensageria
│   ├── backend/                          # API Principal (Django 5.2 + Ninja + QCluster) [Porta 8001 -> 8000]
│   └── notify/                           # Relay WhatsApp & E-mail [Porta 8000] (LAN Interna / Sem Exposição Pública)
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
├── .github/                              # Automações GitHub & Configurações de Agente
│   ├── workflows/                        # Pipelines de CI/CD (ci.yml, release-please.yml, require-issue.yml)
│   ├── pull_request_template.md          # Template obrigatório de Pull Request
│   └── copilot-instructions.md           # Ponto de entrada de instruções para assistentes
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
   - Segredo vai em GitHub Secrets; compartilhamento pontual deve usar ferramenta de one-time secret.
3. **Gerenciador de Pacotes Único**:
   - Utilize estritamente `pnpm` para o ecossistema JavaScript/TypeScript.
   - **NUNCA** use `npm install`, `npm ci` ou `yarn` na raiz. Nunca comite `package-lock.json`.
4. **Gerenciamento de Python**:
   - Utilize estritamente `uv` para executar tarefas e testes em `services/backend` e `services/notify` (`uv run pytest`).
5. **Topologia Multi-Destino de Deploy & Isolamento de Rede**:
   - **Cloudflare Pages**: Apenas as duas landings estáticas Astro (`landing-promotor` e `landing-supletivo`).
   - **Proxmox CT 150 / GHCR Docker (Portais e APIs Públicas via NPM CT 110)**: O Portal Unificado Next.js 16 (`admin` na porta `:3003`), Portal do Aluno (`app-supletivo` na porta `:3020`) e Backend Principal (`backend` na porta `:8001`).
   - **Isolamento Rígido LAN Interna (Sem WAN / Fora do NPM)**: Os serviços `notify` (Porta `:8000`) e `evolution-go` (Porta `:4000`) operam exclusivamente na rede interna (`10.0.1.0/24`) e bridge Docker `v7m_network`. Jamais devem ter rotas públicas ou proxy reverso exposto na WAN.
   - **Neon Cloud Postgres**: Migrações DDL aplicadas diretamente via conexão unpooled.

6. **Padronização de Idiomas (100% Inglês no Código & PT-BR na UI)**:
   - **Código (100% English)**: Todos os identificadores (classes, funções, variáveis, constantes, tipos, schemas, models/colunas de BD, migrations, endpoints, parâmetros de API e nomes de arquivos de código).
   - **Commits e Branches (100% English)**: Mensagens de commit seguindo Conventional Commits em inglês (ex: `feat(auth): implement SSO login`), nomes de branches e PRs.
   - **Interface do Usuário (PT-BR)**: Todos os textos visíveis ao usuário final (labels, botões, modais, tooltips, validações de formulário, mensagens de erro voltadas ao usuário e templates de notificação WhatsApp/E-mail).

---

## 📋 4. Contrato de Trabalho do Agente

1. **Só implemente o que está numa issue aberta**. Se não existir, CRIE a issue antes de começar a codificar.
2. **Branch**: `<issue-number>-short-slug` (ex: `128-sso-login`, `45-fix-commission-filter`).
3. **PR**: Uma issue, um propósito. Corpo OBRIGATÓRIO com `Fixes #<número>` ou `Closes #<número>`.
4. **Commits**: Conventional Commits:
   - `feat(...)` ➔ bump `minor`
   - `fix(...)` ➔ bump `patch`
   - `BREAKING CHANGE:` no footer ➔ bump `major`
   - `chore(...)` / `docs(...)` / `test(...)` ➔ sem release
5. **Footer obrigatório em commits de trabalho**: `Closes #<número>` ou `Fixes #<número>`.
   - Exemplo:
     ```text
     feat(auth): SSO no login

     Closes #128
     ```
6. **NÃO edite versão** em `package.json`, `VERSION` ou `CHANGELOG.md`. Isso é responsabilidade exclusiva do bot de release (`release-please`).
7. **NÃO crie tags `v*` manualmente**. **NÃO faça push direto na branch `main`**.
8. **Squash Merge**: O merge de PRs em `main` deve ser feito via Squash Merge preservando a mensagem formatada com o `Closes #<número>` para acionar o analisador de release.

---

## 🤖 5. PR de Release (Aberto pelo Bot)

Quando o PR automático de release for aberto pelo bot (título no padrão `chore(main): release …` ou `Version Packages`):
- **Auditoria do Changelog**: Confira se cada item do changelog cita `#issue`.
- **Auditoria do SemVer**: Confira se o bump bate com os commits (`feat` sem breaking = `minor`, apenas `fix` = `patch`, `BREAKING CHANGE` = `major`).
- **Validação**:
  - Se faltar issue ou o SemVer estiver errado: peça correção, NÃO aprove.
  - Se estiver correto: aprove o PR e descreva em 3 linhas o que entra na versão.

---

## ✅ 6. Definição de Pronto Estrita (DoD) & Blindagem Anti-Delírio

1. **Proibição de Falsos Closes / Fechamento Parcial**:
   - **NUNCA** use `Closes #X` ou `Fixes #X` se o escopo total e físico da issue não estiver 100% implementado e verificado em tempo de execução.
   - Se um PR entregar apenas uma etapa parcial de uma issue ampla (como um redesign visual de uma unificação arquitetural pendente), o commit e o PR devem usar estritamente `ref #X` ou `relates to #X`, **JAMAIS `Closes #X`**.
2. **Evidência Física e em Runtime Obrigatória**:
   - Para unificações, refatorações ou migrações, a conclusão exige a **remoção física** do código e containers depreciados, atualização do `docker-compose.yml`, esteiras de CI e testes reais rodando contra o container unificado.
   - Não são aceitos mocks, stubs ou declarações teóricas de conclusão sem comprovação via comandos de verificação (`docker ps`, testes de rotas, builds limpos).
3. **Checklist do DoD**:
   - [ ] CI verde (Lint, Types, Build, Pytest).
   - [ ] Paridade funcional 100% comprovada sem resíduos legados.
   - [ ] Issue vinculada (`Fixes #X` / `Closes #X`) estritamente se o escopo completo estiver entregue.
   - [ ] Sem bump manual de versão.
   - [ ] Diff cirúrgico e sem arquivos `.env` ou lixo em disco.

---

## 🔄 7. Ordem do Dia a Dia

```text
Issue #128 aberta (humano ou agente)
    ↓
Agente trabalha na branch 128-short-slug
    ↓
PR com Fixes #128 → check de issue (.github/workflows/require-issue.yml) + CI
    ↓
Merge (Squash) em main
    ↓
release-please atualiza o PR de versão
    ↓
Agente (ou humano) audita o PR de release (regras da Seção 5)
    ↓
Merge do PR de release → tag vX.Y.Z + GitHub Release gerada
    ↓
Issue fecha automaticamente e o changelog aponta o número
```

---

## ⚡ 8. Comandos Canônicos de Desenvolvimento & Validação

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
# Backend Django Principal (321 testes)
cd services/backend && uv run pytest -v

# Notify WhatsApp & Email (270 testes)
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

## 🛡️ 9. Checklist Pré-Commit para Agentes

Antes de propor ou comitar qualquer alteração, o agente deve garantir:
- [ ] Existe uma issue aberta associada.
- [ ] A branch segue o padrão `<issue-number>-short-slug`.
- [ ] `pnpm run version:check` retorna código 0.
- [ ] `pnpm turbo run lint` retorna código 0 (zero erros).
- [ ] `pnpm turbo run check-types` retorna código 0 (zero erros de tipagem).
- [ ] `pnpm turbo run build` gera os artefatos com sucesso.
- [ ] `git commit` referencia a Issue correspondente (`Closes #X` ou `Fixes #X`).
- [ ] `git status` não contém arquivos `.env`, chaves privadas ou arquivos `.md` soltos fora de `docs/`.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **platform-v7m** (16527 symbols, 38730 relationships, 904 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact analysis before editing.** Use `impact({target: "symbolName", direction: "upstream"})` (MCP) or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .` (CLI fallback); report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/platform-v7m/context` | Codebase overview, check index freshness |
| `gitnexus://repo/platform-v7m/clusters` | All functional areas |
| `gitnexus://repo/platform-v7m/processes` | All execution flows |
| `gitnexus://repo/platform-v7m/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
