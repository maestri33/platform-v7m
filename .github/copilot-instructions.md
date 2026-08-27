# Instruções para Agentes de IA — V7M Monorepo

Este repositório segue estritamente as diretrizes definidas em [`AGENTS.md`](../AGENTS.md). Todos os assistentes e agentes de IA (GitHub Copilot, Claude, Cursor, Codex, Aider, etc.) DEVEM cumprir as regras abaixo.

---

## 🎯 Contrato de Trabalho

1. **Só implemente o que está numa issue aberta**. Se não existir issue, CRIE a issue antes de propor qualquer alteração ou código.
2. **Branch**: `<issue-number>-short-slug` (ex: `128-sso-login`, `42-fix-auth-tokens`).
3. **PR**: Uma issue, um propósito. O corpo do PR deve conter OBRIGATORIAMENTE `Fixes #<número>` ou `Closes #<número>`.
4. **Commits**: Conventional Commits:
   - `feat(...)` ➔ bump `minor`
   - `fix(...)` ➔ bump `patch`
   - `BREAKING CHANGE:` no footer ➔ bump `major`
   - `chore(...)` / `docs(...)` / `test(...)` ➔ sem release
5. **Footer obrigatório em commits de trabalho**: `Closes #<número>` ou `Fixes #<número>`.
   - Exemplo:
     ```text
     feat(auth): implementar SSO no login do portal

     Closes #128
     ```
6. **NÃO edite versão manualmente** em `package.json`, `VERSION` ou `CHANGELOG.md`. O controle de versões é gerido exclusivamente pelo bot de release (`release-please`).
7. **NÃO crie tags `v*` manualmente**. **NÃO faça push direto na branch `main`**.
8. **NUNCA cole segredos, senhas ou tokens** em issues, PRs ou commits. Segredos pertencem a GitHub Secrets / One-Time secrets.

---

## 🤖 PR de Release (Aberto pelo Bot)

Quando o PR de release for aberto automaticamente (título no padrão `chore(main): release …` ou `Version Packages`):
- Confira se cada item do changelog gerado cita `#issue`.
- Confira se o bump do SemVer corresponde aos commits (`feat` sem breaking = `minor`, apenas `fix` = `patch`, `BREAKING CHANGE` = `major`).
- Se faltar issue ou o SemVer estiver incorreto: solicite correção e NÃO aprove.
- Se estiver tudo correto: aprove o PR e descreva em 3 linhas o escopo da versão.

---

## ✅ Definição de Pronto (Definition of Done)

- [ ] CI 100% verde (`pnpm run version:check`, `pnpm turbo run lint check-types`, `pytest`).
- [ ] Issue vinculada (`Fixes #X`) e ainda válida.
- [ ] Sem bump manual de versão.
- [ ] Diff cirúrgico e focado exclusivamente na issue resolvida.

---

## 📋 Instrução Padrão ao Delegar Issue para Agente

Ao atribuir uma issue a um agente de codificação, utilize o prompt:
```text
Implemente esta issue seguindo AGENTS.md.
Abra PR com Fixes #<esta-issue>. Não altere versão.
```
