# 🗺️ Roadmap de Produção & Registro de Issues (`docs/operations/roadmap.md`)

Este documento registra as Issues oficiais de produção, seus escopos, critérios de aceitação e passos de execução vinculados ao ciclo de vida do monorepo **V7M**.

---

## 📌 Matriz de Issues Ativas

| Issue | Domínio | Título | Status | Responsável |
| :--- | :--- | :--- | :---: | :--- |
| **#1** | `CI/CD & Deploy` | [Configuração de Secrets no GitHub Actions](#-issue-1-configuração-de-secrets-no-github-actions) | ⏳ Pendente | DevOps / Infra |
| **#2** | `QA & Resiliência` | [Execução da Suíte de Auditoria A2 (9 Módulos)](#-issue-2-suíte-de-auditoria-a2--e2e-adversarial) | 🚀 Pronto para Execução | QA Agent / Playwright |
| **#3** | `Infra & Backend` | [Validação do Ambiente Sandbox Docker & Pytest](#-issue-3-validação-do-ambiente-docker--backends) | 🚀 Pronto para Execução | Backend Lead / Docker |

---

## 🔑 Issue #1: Configuração de Secrets no GitHub Actions

### 🎯 Objetivo
Configurar os secrets necessários no repositório GitHub (`Settings > Secrets and variables > Actions`) para habilitar a automação completa do pipeline de deploy contínuo ([`.github/workflows/deploy.yml`](../deployment/network-mesh.md)).

### 📝 Variáveis a Configurar
1. **Cloudflare Pages** (Landings Astro):
   - `CLOUDFLARE_API_TOKEN`: Token de API Cloudflare com permissão de escrita em Pages.
   - `CLOUDFLARE_ACCOUNT_ID`: ID da conta Cloudflare do domínio `maestri.group`.
2. **Neon Cloud PostgreSQL** (Migrações DDL):
   - `NEON_DATABASE_URL_UNPOOLED`: String de conexão direta (unpooled) para execução de `migrate --noinput` sem lock de pooling.
   - `NEON_NOTIFY_DATABASE_URL_UNPOOLED` *(Opcional)*: String de conexão dedicada para o banco `notify` caso isolado.
3. **GitHub Container Registry** (GHCR):
   - O `GITHUB_TOKEN` padrão do runner é utilizado automaticamente para autenticação e push das imagens `ghcr.io/maestri33/platform-v7m/backend` e `notify`.

### ✅ Critérios de Aceitação
- [ ] Secrets cadastrados no GitHub.
- [ ] Ao realizar push na branch `main`, o job `migrate-neon-db` executa com sucesso.
- [ ] Imagens Docker geradas e tagueadas no GHCR.

---

## 🧪 Issue #2: Suíte de Auditoria A2 / E2E Adversarial

### 🎯 Objetivo
Executar a bateria completa de 9 módulos de testes adversariais, de acessibilidade, concorrência e resiliência de rede localizada no pacote [`tooling/qa-audit`](../../tooling/qa-audit/).

### 📦 Módulos a Validar
1. `01-happy-paths.mjs` — Fluxos felizes de matrícula, checkout e navegação de portais.
2. `02-input-adversarial.mjs` — Injeção de payloads agressivos, quebras de formatação de CPF/telefone e XSS.
3. `03-network-resilience.mjs` — Resiliência a quedas de rede, timeouts de API e retries assíncronos.
4. `04-navigation-session.mjs` — Persistência de estado de autenticação, expiração de JWT e refresh tokens.
5. `05-webhooks-concurrency.mjs` — Disparo simultâneo de webhooks de pagamento (PIX) e mensagens WhatsApp.
6. `06-backend-log-auditor.mjs` — Varredura de logs do backend em busca de exceptions não tratadas ou vazamento de dados.
7. `07-cross-monolith-lifecycle.mjs` — Ciclo de vida completo cruzando Aluno -> Promotor -> Hub -> Admin -> Notify.
8. `08-accessibility-a11y.mjs` — Auditoria automatizada com `axe-core` contra padrões WCAG 2.1 AA.
9. `09-extreme-resolutions.mjs` — Validação visual e de layout em viewports extremas (Mobile 320px até 4K).

### ⚡ Comando de Execução
```bash
pnpm --filter @v7m/qa-audit run audit
```

### ✅ Critérios de Aceitação
- [ ] Todos os 9 módulos executados com relatório consolidado em `tooling/qa-audit/reports/`.
- [ ] Zero falhas críticas bloqueantes de negócio.

---

## 🐳 Issue #3: Validação do Ambiente Docker & Backends

### 🎯 Objetivo
Subir o sandbox local integrado do Docker Compose e executar a suíte de testes unitários e de integração de ambos os backends Django.

### 🧪 Baterias de Testes
1. **Core Backend (`services/backend`)**:
   - 296 testes unitários e de integração cobrindo autenticação, funil KYC, validação de documentos, OCR e finanças.
   ```bash
   cd services/backend && uv run pytest -v
   ```
2. **Notify Microservice (`services/notify`)**:
   - 243 testes unitários e de integração cobrindo relay do Evolution API Go, SMTP/Mailcow, Webhooks e Django-Q.
   ```bash
   cd services/notify && uv run pytest -v
   ```
3. **Docker Compose Sandbox**:
   - Subir todos os 14 containers locais e validar healthchecks de Postgres, Redis, Evolution Go, Notify e Backend.
   ```bash
   pnpm docker:dev
   pnpm docker:logs
   pnpm docker:down
   ```

### ✅ Critérios de Aceitação
- [ ] Pytest do Backend: 100% de aprovação (296 testes).
- [ ] Pytest do Notify: 100% de aprovação (243 testes).
- [ ] `docker compose ps` reporta todos os containers com status `healthy` ou `running`.
