# ⚙️ `turbo.json` Configuration Reference

Referência completa dos campos e propriedades de configuração do arquivo `turbo.json` no Turborepo v2.

---

## 📌 1. Estrutura Raiz

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "globalDependencies": [
    "**/.env.*local",
    "tsconfig.base.json"
  ],
  "globalEnv": [
    "NODE_ENV",
    "CI",
    "VERCEL_URL"
  ],
  "globalPassThroughEnv": [
    "AWS_SECRET_ACCESS_KEY",
    "GITHUB_TOKEN"
  ],
  "tasks": { ... },
  "futureFlags": {
    "affectedUsingTaskInputs": true,
    "experimentalCargoWorkspaces": false
  }
}
```

---

## 📋 2. Propriedades de Tarefa (`tasks.<task-name>`)

| Propriedade | Tipo | Descrição |
| :--- | :--- | :--- |
| `dependsOn` | `string[]` | Lista de tarefas que devem ser concluídas antes desta. Use `"^build"` para dependências de pacotes upstream ou `"build"` para a mesma tarefa local. |
| `inputs` | `string[]` | Globs de arquivos que determinam o hash de cache da tarefa. Use `"$TURBO_DEFAULT$"` para incluir todos os arquivos versionados excluindo regras padrão. |
| `outputs` | `string[]` | Globs de diretórios e arquivos gerados pela tarefa a serem armazenados no cache (ex: `["dist/**", ".next/**", "!.next/cache/**"]`). |
| `env` | `string[]` | Variáveis de ambiente cujo valor deve ser incluído no cálculo do hash da tarefa (ex: `["API_KEY", "NEXT_PUBLIC_*"]`). |
| `passThroughEnv` | `string[]` | Variáveis de ambiente expostas ao processo da tarefa sem influenciar o hash de cache (ex: tokens sensíveis de deploy). |
| `cache` | `boolean` | Define se o Turborepo deve gravar e restaurar do cache (`true` por padrão, `false` para scripts de dev/watch). |
| `persistent` | `boolean` | Define tarefas de longa duração (dev servers, watchers). Evita que outras tarefas dependam dela. |
| `interactive` | `boolean` | Permite que a tarefa interaja com o terminal (recebendo inputs via `stdin`). |
| `interruptible` | `boolean` | Permite que o Turborepo encerre a tarefa imediatamente durante modo watch se novos arquivos forem alterados. |
| `outputLogs` | `string` | Modo de exibição de logs: `"full"`, `"hash-only"`, `"new-only"`, `"errors-only"` ou `"none"`. |

---

## 🧩 3. Microfrontends & Flags Futuras (`futureFlags`)

```json
{
  "futureFlags": {
    "affectedUsingTaskInputs": true,
    "experimentalCargoWorkspaces": true,
    "experimentalPythonWorkspaces": true,
    "experimentalObservability": true
  }
}
```

- **`affectedUsingTaskInputs`**: Permite calcular pacotes e tarefas afetados diretamente pelos globs de arquivos definidos em `inputs`, em vez de invalidar todo o pacote.
- **`experimentalCargoWorkspaces`**: Permite que o Turborepo descubra workspaces Cargo em monorepos combinados Rust + JS/TS.
- **`experimentalPythonWorkspaces`**: Suporte a workspaces gerenciados por ferramentas como `uv`.
- **`experimentalObservability`**: Exportação de métricas e traces via OpenTelemetry (OTel).
