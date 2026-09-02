# 🏛️ Turborepo Internal Architecture Reference

Documento detalhado sobre o funcionamento interno do comando `turbo run` e dos crates Rust que compõem o engine do Turborepo.

---

## 🔄 1. Ciclo de Execução do `turbo run`

O fluxo de um comando `turbo run` passa por 5 etapas principais:

1. **Construção do Package Graph**: Descoberta de pacotes e análise de workspaces (JavaScript/pnpm/npm/yarn/bun, e opcionalmente Cargo workspace ou uv workspace).
2. **Construção do Task Graph**: Definição das relações topológicas e dependências de tarefas com base no `turbo.json` e dependências entre pacotes.
3. **Cálculo Determinístico de Hashes**: Geração do hash global do repositório e hash por tarefa (inputs de arquivos, variáveis de ambiente, hash das dependências upstream).
4. **Execução Topológica das Tarefas**:
   - Consulta ao cache (local `.turbo/cache` e Remote Cache).
   - Se houver cache hit: restaura saídas (`outputs`) e logs instantaneamente.
   - Se houver cache miss: executa a tarefa em subprocesso dedicado com grupos de processos isolados.
   - Ao concluir com sucesso: grava saídas no cache local e envia para o Remote Cache em background.
5. **Sumarização & Coleta**: Geração do resumo de execução (Run Summary / OTel traces / métricas de tempo economizado).

---

## 🧩 2. Componentes & Crates Centrais

### 2.1. Run Builder (`crates/turborepo-lib/src/run/builder.rs`)
- Descoberta de pacotes e análise de lockfiles.
- Filtragem de tarefas baseada em argumentos e flags (`--filter`, `--affected`).
- Resolução de `FilterMode` e injeção automática de root tasks quando aplicável.
- Setup de clientes HTTP compartilhados para Telemetria, Remote Cache e Analytics.
- Inicialização do índice de arquivos rastreados pelo SCM com descoberta incremental.

### 2.2. Package Graph & Repository Knowledge (`crates/turborepo-repository/src/package_graph/`)
- Constrói a geração imutável `RepositoryKnowledge` contendo a raiz do repositório, identidades reais de pacotes, limites de código-fonte e caminhos nativos.
- Suporta dependências cíclicas entre pacotes (permitido por package managers do ecossistema JS), adiando a verificação de ciclos para o nível do grafo de tarefas.
- Classifica tarefas nativas em `Command` (executável real com argumentos e diretório), `Aggregate` (tarefa virtual agregadora de dependências) e `None` (não executável).
- Isola resoluções externas de pacotes através do primitive `turborepo-lockfile-hash`.

### 2.3. Task-Level Affected Detection (`affectedUsingTaskInputs`)
Quando ativado via `futureFlags`:
1. **File Change Detection**: Identifica arquivos alterados via Git SCM entre commits/refs.
2. **Task Input Matching**: Compila os globs de `inputs` de cada tarefa e compara com os arquivos alterados.
3. **Task Change Detection**: Determina tarefas diretamente afetadas.
4. **Affected Expansion**: Expande dependentes transitivos no grafo de tarefas.
5. **Package Scope Composition**: Intersecta tarefas afetadas com o escopo de pacotes selecionados, evitando executar dependências desnecessárias.

---

## 🛑 3. Gerenciamento de Sinais & Shutdown Gracioso

### Separação de Responsabilidades:
- **Graceful Shutdown**: Ocorre enquanto o processo do Turbo está vivo e deve ser orquestrado internamente.
- **Parent-Death Cleanup**: Tratamento para quando o processo Turbo é eliminado abruptamente (`SIGKILL` ou crash).

### Mecanismo do `SignalHandler`:
- Centralizado em `crates/turborepo-lib/src/commands/run.rs`.
- Tarefas filhas são inicializadas em **process groups** dedicados para possibilitar envio de sinais a toda a árvore de processos descendentes.
- No primeiro `SIGINT`/`SIGTERM`: Turbo notifica as tarefas em execução e aguarda o encerramento ordenado.
- Se tarefas continuarem ativas após 3 segundos: exibe a lista de tarefas pendentes e solicita segundo `Ctrl+C` no terminal interativo.
- No Unix: um segundo sinal ou timeout de 10s sem TTY força o encerramento (`SIGKILL`).
- No Windows: fallback para encerramento imediato via Windows Job Objects para garantir que nenhum processo órfão permaneça em execução.
