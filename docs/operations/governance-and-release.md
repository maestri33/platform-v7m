# 🛡️ Governança de Repositório, Issues e Pipeline de Release

Este documento especifica a configuração de governança do GitHub (Rulesets), regras de bloqueio de merge sem ticket, automações de release e fluxo operacional do monorepo **V7M**.

---

## 1. Configuração de Rulesets no GitHub

Configurado em: **Settings → Rules → Rulesets** no repositório `platform-v7m`.

### 📌 Ruleset 1: Proteção da Branch `main`
- **Target**: `Include default branch` (`main`)
- **Restrições ativadas**:
  - `Require a pull request before merging`
    - Require approvals: 1 (opcional para times)
    - Dismiss stale pull request approvals when new commits are pushed
    - Require review from Code Owners (se aplicável)
  - `Require status checks to pass before merging`
    - `CI — V7M Monorepo / Lint & Typecheck`
    - `CI — V7M Monorepo / Frontend Tests`
    - `CI — V7M Monorepo / Backend & Notify Pytest`
    - `Require linked issue / Verify Linked Issue` (ou regra nativa do GitHub)
    - Require branches to be up to date before merging
  - `Require linked issues` (se disponível no plano da organização/conta)
  - `Block force pushes`
  - `Block branch deletions`

### 📌 Ruleset 2: Proteção de Tags de Release (`v*`)
- **Target**: `Include tag pattern` -> `v*`
- **Restrições ativadas**:
  - `Restrict creation`: Permitir apenas o bot do GitHub Actions / release bot criar tags `v*`.
  - `Restrict update`: Bloqueado para todos.
  - `Restrict deletion`: Bloqueado para todos.

---

## 2. Bloqueio de CI: Verificação de Issue Vinculada

Arquivo: [`.github/workflows/require-issue.yml`](../../.github/workflows/require-issue.yml)

Quando um PR é aberto ou atualizado, a Action consulta a API GraphQL do GitHub para validar se há issues vinculadas na lista de fechamento (`closingIssuesReferences`).

Se não houver issue vinculada (ex: `Fixes #123` ou `Closes #123` no corpo do PR ou via interface do GitHub), o check falha impedindo o merge. PRs automáticos de release gerados por bots (`release-please`, `Version Packages`) são identificados e ignorados automaticamente.

---

## 3. Template de Pull Request

Arquivo: [`.github/pull_request_template.md`](../../.github/pull_request_template.md)

Padroniza todos os PRs exigindo a referência à issue e o tipo de release:
- `Fixes #<número>`
- Checklist de tipo de release: `patch`, `minor` ou `major`
- Validação do checklist de DoD (Definition of Done)

---

## 4. Pipeline de Release com `release-please`

Arquivo: [`.github/workflows/release-please.yml`](../../.github/workflows/release-please.yml)

### Como funciona o ciclo de release:
1. **Merge de PR de Feature/Fix**:
   - Desenvolvedor ou agente faz squash merge de um PR com Conventional Commits (`feat: ...` ou `fix: ...`) contendo `Closes #X`.
2. **Bot cria/atualiza o Release PR**:
   - `release-please` analisa o histórico de commits desde a última tag e atualiza um PR único: `chore(main): release X.Y.Z`.
   - O `CHANGELOG.md` é atualizado automaticamente incluindo os links para as issues.
3. **Auditoria Humana / Agente**:
   - Verificar se cada item do changelog cita a `#issue` correspondente.
   - Verificar se o bump bate com o tipo de mudança (feat = minor, fix = patch, BREAKING CHANGE = major).
   - Aprovar o PR com resumo de 3 linhas.
4. **Merge do Release PR**:
   - Ao fazer o merge do PR de release em `main`, o release-please cria a tag `vX.Y.Z` e publica o GitHub Release correspondente.
   - A issue associada é fechada automaticamente pelo GitHub.

---

## 5. Contrato de Instruções para Agentes

Arquivos canônicos:
- [`AGENTS.md`](../../AGENTS.md) na raiz do repositório.
- [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) no diretório `.github/`.

### Prompt Canônico ao Despachar Tarefas para Agentes:
```text
Implemente esta issue seguindo AGENTS.md.
Abra PR com Fixes #<esta-issue>. Não altere versão.
```
