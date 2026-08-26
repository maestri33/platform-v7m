---
name: turborepo
description: |
  Especialista em Turborepo (Vercel), monorepos de alta performance, configuração de pipelines (turbo.json), cache local e remoto, otimização de CI/CD, pruning para Docker, e desenvolvimento/contribuição no engine Rust do Turborepo.
  Ativar quando:
  - Configurar, refatorar ou otimizar monorepos com Turborepo (`turbo.json`, pnpm/npm/yarn/bun workspaces).
  - Definir pipelines de tarefas (`dependsOn`, `inputs`, `outputs`, `env`, `globalEnv`, `cache`, `persistent`).
  - Executar filtros avançados (`--filter`), detecção de afetados (`--affected`) e geração de hashes de cache.
  - Implementar Docker builds otimizados com `turbo prune` e microfrontends (MFE).
  - Contribuir ou trabalhar no codebase interno do Turborepo (Rust crates, panic policy, clippy, `ARCHITECTURE.md`, signal handling).
  - Investigar falhas de cache, depurar tarefas, configurar Remote Cache (Vercel/Self-hosted) ou flags experimentais (`futureFlags`).
metadata:
  version: "1.0.0"
  publisher: "maestri33"
---

# 🚀 Turborepo Expert Skill

Guia definitivo e padronizado para **Turborepo** — cobrindo tanto o uso avançado em **monorepos de aplicações** quanto as **regras de desenvolvimento interno e arquitetura do engine Rust** baseadas no `AGENTS.md`, `ARCHITECTURE.md` e `CONTRIBUTING.md`.

---

## 📑 Sumário

1. [Princípios Fundamentais & Visão Geral](#-1-princípios-fundamentais--visão-geral)
2. [Estrutura de Monorepo & Configuração (`turbo.json`)](#-2-estrutura-de-monorepo--configuração-turbojson)
3. [Comandos & Filtros Essenciais](#-3-comandos--filtros-essenciais)
4. [Estratégias de Cache & Docker Pruning](#-4-estratégias-de-cache--docker-pruning)
5. [Diretrizes de Desenvolvimento no Engine do Turborepo (Rust Crates)](#-5-diretrizes-de-desenvolvimento-no-engine-do-turborepo-rust-crates)
6. [Políticas para Agentes de IA (`AGENTS.md` Rules)](#-6-políticas-para-agentes-de-ia-agentsmd-rules)
7. [Documentação de Referência](#-7-documentação-de-referência)

---

## 🎯 1. Princípios Fundamentais & Visão Geral

Turborepo é um sistema de build de alta performance para monorepos JavaScript, TypeScript e multi-ecossistema (Rust Cargo, Python uv).

- **Incremental Builds**: Nunca execute a mesma tarefa duas vezes se as entradas não mudaram.
- **Topological Task Graph**: Execução paralela inteligente baseada nas dependências do grafo.
- **Hermetic Hashing**: Hashes determinísticos derivados de inputs de arquivos, variáveis de ambiente declaradas, dependências e closure de pacotes.
- **Remote Caching**: Compartilhamento instantâneo de artefatos de build entre equipe e pipelines de CI/CD.
- **Zero Configuration Overhead**: Integração direta com workspaces nativos do `pnpm`, `npm`, `yarn` e `bun`.

---

## 🏗️ 2. Estrutura de Monorepo & Configuração (`turbo.json`)

### 2.1. Estrutura de Diretórios Típica

```text
my-monorepo/
├── apps/
│   ├── web/               # Aplicação Next.js / React
│   │   ├── package.json
│   │   └── turbo.json     # (Opcional) Configuração local do workspace
│   └── api/               # Backend API / Fastify / NestJS
│       └── package.json
├── packages/
│   ├── ui/                # Componentes compartilhados
│   │   └── package.json
│   ├── typescript-config/ # tsconfig.json base
│   └── eslint-config/     # Configurações de linter
├── package.json           # Root package.json
├── pnpm-workspace.yaml    # Definição de workspaces (se usando pnpm)
└── turbo.json             # Configuração global de tarefas do Turborepo
```

### 2.2. Configuração Canônica do `turbo.json` (v2)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "globalDependencies": [
    "**/.env.*local",
    "tsconfig.json"
  ],
  "globalEnv": [
    "NODE_ENV",
    "CI"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", "build/**"],
      "env": ["NEXT_PUBLIC_*", "API_URL"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "tests/**/*.ts"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^lint"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", ".eslintrc*"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "//#format": {
      "inputs": ["**/*.md", "**/*.json", "!node_modules/**"]
    }
  },
  "futureFlags": {
    "affectedUsingTaskInputs": true,
    "experimentalCargoWorkspaces": false
  }
}
```

### 2.3. Sintaxe de Dependências de Tarefas (`dependsOn`)

- `^<task>`: Executa a tarefa `<task>` nos **pacotes dependentes imediatos (upstream)** antes de executar no pacote atual (ex: `"^build"`).
- `<task>`: Executa a tarefa `<task>` **no mesmo pacote** antes da tarefa atual (ex: `"test"` dependendo de `"build"` local).
- `//#<root-task>`: Define uma tarefa executada exclusivamente na **raiz do repositório** (ex: `//#lint:root` ou `//#format`).

---

## ⚡ 3. Comandos & Filtros Essenciais

### 3.1. Execução de Tarefas

```bash
# Executar build em todo o monorepo
turbo run build

# Executar múltiplas tarefas em paralelo respeitando o grafo
turbo run build test lint

# Passar argumentos extras diretamente para o script subjacente
turbo run dev -- --port 3001
```

### 3.2. Filtros Avançados (`--filter`)

| Padrão de Filtro | Descrição |
| :--- | :--- |
| `turbo run build --filter=web` | Executa apenas no pacote `web`. |
| `turbo run build --filter=web...` | Executa em `web` e em **todas as suas dependências upstream**. |
| `turbo run build --filter=...web` | Executa em `web` e em **todos os pacotes que dependem dele (downstream)**. |
| `turbo run build --filter=./packages/*` | Filtra por caminho de diretório. |
| `turbo run build --filter=!@repo/docs` | Exclui explicitamente o pacote informado. |
| `turbo run build --filter=...[origin/main]` | Executa nos pacotes modificados em relação à branch `main`. |
| `turbo run build --affected` | Executa apenas nos pacotes (ou tarefas) afetados pelas alterações do git. |

---

## 📦 4. Estratégias de Cache & Docker Pruning

### 4.1. Remote Caching (Vercel & Custom Providers)

```bash
# Autenticar com o Vercel Remote Cache
turbo login

# Vincular monorepo ao projeto/time do Vercel
turbo link

# Desabilitar cache para uma execução específica
turbo run build --no-cache

# Forçar reexecução e sobrescrever cache existente
turbo run build --force
```

### 4.2. Docker Multi-Stage Build com `turbo prune`

Gere um sub-monorepo isolado contendo apenas o código e as dependências necessárias para a aplicação alvo:

```bash
# Cria pasta `out` com `json` (package.jsons/lockfiles) e `full` (código fonte)
turbo prune web --docker
```

#### Exemplo de `Dockerfile` Otimizado:

```dockerfile
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 1. Prune step
FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune web --docker

# 2. Dependency installation step (maximiza cache de camadas Docker)
FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

# 3. Build step
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=web...

# 4. Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=installer /app/apps/web/.next/standalone ./
COPY --from=installer /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

---

## 🦀 5. Diretrizes de Desenvolvimento no Engine do Turborepo (Rust Crates)

Se você estiver desenvolvendo ou corrigindo funcionalidades dentro do repositório oficial do Turborepo (`github.com/vercel/turborepo`):

### 5.1. Arquitetura Interna dos Crates

```text
crates/
├── turborepo/               # Ponto de entrada do binário CLI (main.rs)
├── turborepo-lib/           # Orquestração do `turbo run`, Run Builder, Engine, Signal Handling
│   ├── src/run/             # Lógica central do ciclo de vida de execução
│   ├── src/engine/          # Task Graph Engine e agendamento de execução
│   └── src/task_graph/      # Construção e validação do grafo de tarefas
├── turborepo-repository/    # Package Graph, RepositoryKnowledge, detecção de toolchains (JS/Cargo/uv)
├── turborepo-cache/         # Caching local (fs) e remoto (HTTP/gRPC/OIDC), hashing de inputs
├── turborepo-daemon/        # Daemon de background para watch e LSP
├── turborepo-types/         # Tipos e estruturas de dados compartilhadas
└── turborepo-telemetry/     # Instrumentação OTel e métricas
```

### 5.2. Pré-requisitos & Dependências de Build

- **Rust**: Versão definida em `rust-toolchain.toml` (via `rustup`).
- **Node.js**: v22+ e **pnpm**: v10+.
- **Compiladores & Geradores**: `protoc` (Protocol Buffers) e `capnp` (Cap'n Proto).
- **Zig**: `>= 0.15.2` (obrigatório para compilar `libghostty-vt-sys` para a TUI). O binário `zig` deve estar no `PATH`.
- **Utilitários de Teste**: `jq` e `zstd` (Windows: `choco install jq zstandard`, Linux: `apt install jq zstd`, macOS: `brew install jq zstd`).
- **Opcionais**: `bun` (para `@turbo/gen`), `uv` (para testes de workspace Python).

### 5.3. Comandos de Compilação e Teste no Crate

```bash
# Instalar dependências de JS
pnpm install --frozen-lockfile

# Compilar binário com TLS padrão (rustls)
cargo build

# Compilar com OpenSSL nativo
cargo build --no-default-features --features native-tls

# Executar linter estrito do workspace
cargo lint

# Executar testes unitários
cargo test

# Executar testes de um crate específico
cargo test -p turborepo-lib
cargo test -p turbo --test force_test

# Testar manualmente o binário compilado sem inferência local
alias devturbo='target/debug/turbo'
devturbo run build --skip-infer
```

> [!IMPORTANT]
> A flag `--skip-infer` é indispensável nos testes manuais para evitar que o binário de desenvolvimento delegue a execução para o `turbo` global ou instalado no repositório.

---

## 🤖 6. Políticas para Agentes de IA (`AGENTS.md` Rules)

Ao interagir ou gerar PRs no repositório do Turborepo, os seguintes padrões são obrigatórios:

### 6.1. Política Estrita de Extração de Panics em Rust

- O Clippy do workspace **PROÍBE** o uso de `.unwrap()`, `.unwrap_err()`, `.unwrap_none()` e `.expect()` em código de implementação de produção verificado por `cargo lint`.
- Use sempre pattern matching explícito (`match`, `if let`) ou o operador de propagação de erros `?` com types `Result<T, E>` / `miette` / `thiserror`.
- Código de teste (`#[cfg(test)]`) é **isento** dessa proibição de panic.
- Crates legados podem conter temporariamente `#![allow(clippy::unwrap_used, clippy::expect_used)]` no root do crate enquanto são refatorados, devendo ser removidos após saneamento.

### 6.2. Git Hooks & Verificação Pré-Commit

- **NUNCA** use `--no-verify` ao criar commits ou realizar push.
- Todos os hooks de pre-commit e pre-push devem ser executados com sucesso.
- Se faltarem dependências, execute `pnpm install --frozen-lockfile`.

### 6.3. Sincronização Obrigatória de Documentação

Ao alterar partes do código, verifique e atualize a documentação correspondente:

- **`crates/turborepo/ARCHITECTURE.md`**: Deve ser atualizado ao modificar:
  - Run builder, package graph, task graph ou task engine.
  - Task visitor, caching system ou task hashing.
  - Run tracking, summaries ou arquivos em `crates/turborepo-lib/src/run/`, `crates/turborepo-lib/src/engine/`, `crates/turborepo-lib/src/task_graph/` ou `crates/turborepo-cache/`.
- **`CONTRIBUTING.md`**: Deve ser atualizado ao modificar procedimentos de setup, ferramentas, dependências ou processos de teste.
- **`AGENTS.md`**: Deve ser atualizado ao modificar requisitos de PR, convenções do repositório ou workflows de CI.

### 6.4. Gerenciamento de Sinais & Shutdown Gracioso

- O encerramento por sinal (`SIGINT`/`SIGTERM`) e o encerramento por fechamento normal (`Close`) são tratados por um `SignalHandler` unificado.
- Processos de tarefas são gerados em grupos de processos dedicados (`process groups`).
- No primeiro `SIGINT`, o Turbo repassa o sinal e aguarda o encerramento do grupo de processos (aguarda até 3s antes de alertar e 10s antes de forçar encerramento no Unix).
- No Windows, o shutdown recorre a Job Objects para garantir que nenhum processo filho órfão sobreviva.

### 6.5. Agendamento de CI & Remote Cache

- Não crie lógica de pré-classificação manual de caminhos em workflows de CI; confie no grafo de tarefas e no cache do Turborepo.
- PRs da mesma origem usam OIDC para autenticação no Remote Cache com permissão de escrita; forks mantêm-se em cache local apenas.
- Restauração de snapshots do diretório `target` do Cargo em Rust é confiada a partir da branch `main`.

---

## 📚 7. Documentação de Referência

Para aprofundamento em tópicos específicos:
- [Arquitetura Detalhada do Engine (`turbo run`)](./references/architecture.md)
- [Guia de Contribuição & Setup Rust](./references/contributing-guidelines.md)
- [Referência Completa de Configuração `turbo.json`](./references/turbo-json-reference.md)
- [Diretrizes de CI e Workflows](./references/ci-and-workflows.md)
