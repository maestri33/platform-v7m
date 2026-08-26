# BRIEFING — 2026-08-26T18:27:30Z

## Mission
Survey codebase for testing scripts, curl/healthcheck runners, E2E validation harnesses, failure modes (525/522/504/502), and acceptance criteria verification methods for all 12 domains + job.v7m.org isolation.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_explorer_survey_3
- Original parent: 2bc34ea9-17ef-4be2-9e86-c0a722ff9189
- Milestone: survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Files for content delivery, Messages for coordination
- Handoff report in handoff.md with 5-component format
- Write only to own directory (.agents/teamwork_preview_explorer_survey_3/)

## Current Parent
- Conversation ID: 2bc34ea9-17ef-4be2-9e86-c0a722ff9189
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `TEST_INFRA.md`, `ENVIRONMENT_SPECS.md`, `ARCHITECTURE.md`, `PROJECT.md`, `package.json`, `turbo.json`
  - `scripts/e2e-platform-test.mjs`, `scripts/visual-e2e.spec.mjs`, `scripts/platform-chaos.spec.mjs`, `scripts/ci-audit.mjs`
  - `tooling/qa-audit/run-all-audit.mjs`
  - `services/backend/api/health/router.py`, `services/backend/core/urls.py`, `services/backend/tests/test_health_public.py`
  - `docker-compose.yml`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
  - Domain isolation: verified global 0 active occurrences of `job.v7m.org` across apps, services, packages, scripts, specs, and workflows.
- **Key findings**:
  - Exact JSON contract for `/api/v1/health/healthz` identified: `{"status": "ok", "db": true, "migrations_pending": 0}` with optional fields `version`, `sha`, `built_at`.
  - Comprehensive mapping of all 12 target domains, upstream routes, Proxmox/NPM ports, Cloudflare DNS configurations, and TLS termination models.
  - In-depth failure mode analysis (525, 522, 504, 502, Grey vs Orange Cloud) and actionable remediation strategies.
  - Multi-tier automated validation harness architecture designed (DNS/TLS probe, HTTP healthcheck runner, Playwright E2E).
- **Unexplored areas**: None. Codebase survey and verification design are complete.

## Key Decisions Made
- Designed a unified 3-tier validation harness covering DNS/TLS, cURL/HTTP status contracts, and Playwright browser rendering.
- Documented exact validation commands, healthcheck contracts, failure mode diagnostic tables, and test runner implementations.

## Artifact Index
- handoff.md — Complete survey findings and test harness design report
- progress.md — Heartbeat and status log
- DISPATCH.md — Initial dispatch instructions log
