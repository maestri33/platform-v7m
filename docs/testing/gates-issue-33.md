# 🛡️ Acceptance Gates Ledger — Issue #33

- **Issue**: [#33](https://github.com/maestri33/platform-v7m/issues/33) — `feat(portal): consolidar portal único de trabalho em app.maestri.group com funil instantâneo e navegação cumulativa`
- **Pull Request**: [#34](https://github.com/maestri33/platform-v7m/pull/34)
- **Branch**: `33-portal-unified-app-maestri-group`
- **Data de Execução**: 2026-08-29
- **Status Geral**: **100% HOMOLOGADO / TODOS OS GATES VERDES**

---

## 🎯 1. Objetivos e Critérios de Aceite

| ID | Critério | Verificação / Evidência | Status |
|:---:|---|---|:---:|
| **G1** | Topologia Canônica de 2 Domínios | `app.supletivo.net.br` (Aluno) e `app.maestri.group` (Trabalho) isolados sem contaminação de papéis | ✅ PASS |
| **G2** | Entrada Única (Dual CPF + WhatsApp) | Coleta de CPF com validação algoritmo módulo 11 e máscara em tempo real | ✅ PASS |
| **G3** | Auto-cadastro Instantâneo de Promotor | Novo usuário válido aciona `/collaborators/auth/register` e vai direto pro OTP sem fricção | ✅ PASS |
| **G4** | Aterrissagem Base em `/vendas` | Rota raiz `/` e pós-login encaminham todos os colaboradores para a dashboard de promotor | ✅ PASS |
| **G5** | RBAC Cumulativo no Header | Coordenador vê `🏛️ Hub Regional`; Master Admin vê `🏛️ Hub Regional` + `👑 Painel Master` | ✅ PASS |
| **G6** | Suíte E2E Portal de Trabalho | `apps/admin` executa 85 testes Playwright com 0 falhas | ✅ PASS |
| **G7** | Suíte E2E Portal do Aluno | `apps/app-supletivo` executa 129 testes Playwright com 0 falhas | ✅ PASS |
| **G8** | Backend Django Ninja Core | `services/backend` executa 349 testes com 0 falhas | ✅ PASS |
| **G9** | Relay WhatsApp & Email | `services/notify` executa 274 testes com 0 falhas | ✅ PASS |
| **G10** | Monorepo Linter & Typecheck | `pnpm turbo run check-types lint` sem nenhum erro em 10 workspaces | ✅ PASS |
| **G11** | Lockstep Version Integrity | `pnpm run version:check` reporta 100% de sincronismo em `v0.1.0-alpha.1` | ✅ PASS |

---

## 📊 2. Evidências de Execução em Runtime

### 2.1 Playwright E2E — Portal de Trabalho (`apps/admin`)
```text
Running 85 tests using 1 worker
  85 passed (1.2m)
```

### 2.2 Playwright E2E — Portal do Aluno (`apps/app-supletivo`)
```text
Running 129 tests using 1 worker
  129 passed (3.6m)
```

### 2.3 Pytest — Backend Core (`services/backend`)
```text
====================== 349 passed, 71 warnings in 27.29s ======================
```

### 2.4 Pytest — Notify Relay (`services/notify`)
```text
======================= 274 passed, 1 skipped in 14.84s =======================
```

### 2.5 Turborepo — Typecheck & Lint
```text
 Tasks:    8 successful, 8 total
Cached:    6 cached, 8 total
  Time:    46.628s
```
