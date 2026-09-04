# OmniRoute AI Gateway CT 1135 (10.0.1.135) Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate OmniRoute AI Gateway from CT 135 (`10.0.1.35`) to newly provisioned CT 1135 (`10.0.1.135`) with persistent port 80 redirect enabled, and update all service defaults, tests, mock helpers, tooling probes, and documentation across the V7M monorepo.

**Architecture:** CT 1135 (`10.0.1.135`) runs OmniRoute in Docker with `network_mode: host` listening on port `20128`. A persistent systemd unit (`omniroute-port80.service`) uses kernel iptables NAT redirection to expose port 80 cleanly without proxy overhead. The monorepo backend (Django 5.2 Ninja), notify relay, Next.js frontend setup wizard, QA audit probes, and test suites are updated to point to `http://10.0.1.135/v1` and `http://10.0.1.135`.

**Tech Stack:** Proxmox VE, Debian 13 (LXC CT 1135), Docker, systemd, iptables, Django 5.2, Django Ninja, Next.js 16, Turborepo 2, pnpm, uv/pytest.

**Spec:** Issue #200 (feat(infra): migrate OmniRoute AI Gateway endpoint to CT 1135 (10.0.1.135))

## Global Constraints

- Never commit secrets, .env files, private keys, or credentials.
- 100% English for code identifiers, commits, branches, and PRs.
- PT-BR for user-facing interface text (dashboard, settings labels).
- All changes reference Issue #200 (`Closes #200` in commit message).
- Quality gates: `pnpm run version:check`, `pnpm turbo run lint check-types build`, `uv run pytest`.

---

### Task 1: CT 1135 Port 80 Persistence & sysctl Configuration

**Files:**
- System: `/etc/systemd/system/omniroute-port80.service` on CT 1135 (`10.0.1.135`)
- System: `/etc/sysctl.d/99-omniroute.conf` on CT 1135 (`10.0.1.135`)

- [x] **Step 1: Verify iptables redirect and systemd unit on CT 1135**
  Verify `/etc/systemd/system/omniroute-port80.service` is active and redirects PREROUTING/OUTPUT port 80 to 20128.
- [x] **Step 2: Persist sysctl unprivileged port setting**
  Write `/etc/sysctl.d/99-omniroute.conf` with `net.ipv4.ip_unprivileged_port_start=0`.
- [x] **Step 3: Test HTTP connectivity from external host**
  Verify `curl -s -o /dev/null -w "%{http_code}" http://10.0.1.135/v1/models` returns `200`.

---

### Task 2: Update Backend Service Defaults & Integrations (`services/backend`)

**Files:**
- Modify: `services/backend/core/settings.py`
- Modify: `services/backend/integrations/ai/tts.py`
- Modify: `services/backend/integrations/ai/omniroute_ocr.py`
- Modify: `services/backend/integrations/ai/providers.py`
- Modify: `services/backend/integrations/ai/service.py`
- Modify: `services/backend/integrations/status.py`
- Modify: `services/backend/tests/test_omniroute_integrations.py`

- [ ] **Step 1: Update backend settings & AI integration modules**
  Update default `OMNIROUTE_BASE_URL` from `http://10.0.1.35/v1` to `http://10.0.1.135/v1` and TTS base from `http://10.0.1.35` to `http://10.0.1.135`.
- [ ] **Step 2: Update backend test fixtures and assertions**
  Update test URLs in `services/backend/tests/test_omniroute_integrations.py`.
- [ ] **Step 3: Run backend test suite**
  Run `cd services/backend && uv run pytest -k omniroute -v` and verify 100% pass.

---

### Task 3: Update Notify Service Defaults & Templates (`services/notify`)

**Files:**
- Modify: `services/notify/notify_server/settings.py`
- Modify: `services/notify/accounts/models.py`
- Modify: `services/notify/notify/dashboard.py`
- Modify: `services/notify/notify/templates/dashboard/settings.html`
- Modify: `services/notify/notify/templates/dashboard/setup.html`
- Modify: `services/notify/.env.example`
- Modify: `services/notify/tests/test_e2e_suite.py`
- Modify: `services/notify/tests/test_setup_wizard.py`

- [ ] **Step 1: Update notify settings, dashboard templates and placeholders**
  Update `OMNIROUTER_URL` default to `http://10.0.1.135`, update placeholders in HTML templates.
- [ ] **Step 2: Update notify tests**
  Update test URLs in `tests/test_e2e_suite.py` and `tests/test_setup_wizard.py`.
- [ ] **Step 3: Run notify test suite**
  Run `cd services/notify && uv run pytest tests/test_setup_wizard.py tests/test_e2e_suite.py -v` and verify 100% pass.

---

### Task 4: Update Frontend App, QA Audit & Production Suite Probes

**Files:**
- Modify: `apps/group/src/app/(app)/configuracoes/page.tsx`
- Modify: `apps/group/src/app/setup/setup-wizard.tsx`
- Modify: `apps/group/tests/e2e/helpers/mock-api.ts`
- Modify: `tooling/qa-audit/10-external-integrations-probe.mjs`
- Modify: `scripts/audit_production_suite.py`

- [ ] **Step 1: Update frontend placeholders and defaults**
  Update `OMNIROUTE_BASE_URL` in `page.tsx`, `setup-wizard.tsx`, and `mock-api.ts`.
- [ ] **Step 2: Update probes in QA audit and audit suite**
  Update endpoint checks to `http://10.0.1.135/v1/models`.
- [ ] **Step 3: Run frontend typecheck and lint**
  Run `pnpm turbo run check-types lint --filter=@v7m/group`.

---

### Task 5: Update Network & Operational Documentation

**Files:**
- Modify: `docs/deployment/network-mesh.md`
- Modify: `docs/operations/environment-variables.md`
- Modify: `docs/operations/runbooks.md`
- Modify: `docs/testing/integrations-audit-report.md`
- Modify: `apps/group/docs/SETUP_AND_INTEGRATION_GUIDE.md`
- Modify: `apps/group/AGENTS.md`

- [ ] **Step 1: Update documentation tables and architecture diagrams**
  Document CT 1135 (`10.0.1.135`) as active OmniRoute Gateway, deprecating CT 135 (`10.0.1.35`).
- [ ] **Step 2: Verify git status and ensure no .md files loose in root**
  Ensure documentation conforms strictly to AGENTS.md rule 1.

---

### Task 6: Deploy/Reload Containers on CT 150 & Full Validation

- [ ] **Step 1: Update live environment on CT 150**
  Reload backend and notify containers with new `OMNIROUTE_BASE_URL=http://10.0.1.135/v1`.
- [ ] **Step 2: Execute full regression tests**
  Run `pnpm turbo run check-types lint build` and pytest suites.
- [ ] **Step 3: Commit and push branch with Closes #200**
