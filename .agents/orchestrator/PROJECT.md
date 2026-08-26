# Project: V7M Domain Mesh Restructuring and Frontend Hardening

## Architecture

The V7M Monorepo frontend ecosystem is partitioned into two distinct domain brand spaces, completely eliminating legacy/obsolete domains (`job.v7m.org`, `app.v7m.org`, `hub.v7m.org`, `staff.v7m.org`):

### 1. Promoter & Operations Space (`maestri.group`)
- **`apps/landing-promotor`** (Astro 6 SSG) -> `maestri.group` & `www.maestri.group` (Promoter acquisition landing page).
- **`apps/app-promotor`** (Next.js 16 Standalone) -> `app.maestri.group` (Promoter workspace & commission tracking).
- **`apps/hub`** (Next.js 16 Standalone) -> `hub.maestri.group` (Regional leadership & promoter coordinator portal).
- **`apps/admin`** (Next.js 16 Standalone) -> `admin.maestri.group` (Executive administration & backoffice cockpit).

### 2. Student & Education Space (`supletivo.net.br`)
- **`apps/landing-supletivo`** (Astro 6 SSG) -> `supletivo.net.br` & `www.supletivo.net.br` (Student acquisition & enrollment landing).
- **`apps/app-supletivo`** (Next.js 16 Standalone) -> `app.supletivo.net.br` (Student onboarding, lead qualification, payment & LMS).

### 3. Backend & API Services
- **Backend Origin**: `services/backend` (Django Ninja REST API at `URL_BACKEND` / `BACKEND_URL`).
- **Notification Services**: `services/notify` (Evolution API & Webhook dispatcher).
- **Proxy Architecture**: `admin`, `hub`, and `app-supletivo` proxy `/api/*` and `/media/*` server-side to `URL_BACKEND` via Next.js `rewrites()`. `app-promotor` communicates via server-side `djangoFetch`.

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Eradicate `job.v7m.org` references | Remove/replace all 24 occurrences across configs, SVGs, code, and test mocks | M1 | Survey |
| 2 | Canonical Domain Mapping `maestri.group` | Configure `landing-promotor` (Astro site, metadata, contact email) & `app-promotor` | M1 | Survey |
| 3 | Canonical Domain Mapping `supletivo.net.br` | Configure `landing-supletivo` & `app-supletivo` with correct student portal & legal URLs | M1 | Survey |
| 4 | Hub & Admin Domain Realignment | Update drawer links, env examples, and references to `hub.maestri.group` & `admin.maestri.group` | M1 | Survey |
| 5 | Promoter Referral Link Fix | Set promoter candidate/student referral URLs to `https://supletivo.net.br/?ref={id}` | M1 | Survey |
| 6 | Specs & Documentation Alignment | Update `ENVIRONMENT_SPECS.md` and `specs/*.md` to reflect canonical 6-frontend mesh | M1 | Survey |
| 7 | Next.js CSP & Security Headers Hardening | Fix `hub/next.config.ts` unsafe-eval in prod; enforce `frame-ancestors 'none'`, nosniff, referrer-policy | M2 | Survey |
| 8 | Astro Landings Edge Headers (`_headers`) | Create `public/_headers` for static Cloudflare Pages with strict CSP and security headers | M2 | Survey |
| 9 | API Client Socket Reconnect Resilience | Port `TypeError` dead keep-alive socket retry (`RETRY_DELAYS_MS = [250, 900]`) to `admin`, `hub`, `@v7m/api-client` | M2 | Survey |
| 10 | Single-Flight Token Refresh Mutex | Implement refresh mutex across `admin`, `hub`, and `@v7m/api-client` to eliminate 401 race conditions | M2 | Survey |
| 11 | Backend CORS Origins Alignment | Ensure backend `CORS_ALLOWED_ORIGINS` explicitly allows all 6 production frontend domains | M2 | Survey |
| 12 | TypeScript & ESLint Lint Error Fix | Fix `@typescript-eslint/no-explicit-any` in `apps/admin/src/app/api/copilotkit/route.ts:31` | M3 | Survey |
| 13 | Monorepo `check-types` Implementation | Add `"check-types": "tsc --noEmit"` to workspace `package.json` files for automated typechecking | M3 | Survey |
| 14 | Workspace Test Script Neutralization | Fix `services/notify/package.json` exit 1 test placeholder so `turbo test` executes cleanly | M3 | Survey |
| 15 | CI/CD & Deploy Workflow Rectification | Fix `.github/workflows/deploy.yml` removing `continue-on-error: true` and aligning deployment targets | M3 | Survey |
| 16 | 100% Quality & Build Verification | Run and pass `lint`, `check-types`, `test`, and `build` across all 6 frontends and packages | M4 | Survey |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Domain Mesh Mapping & Obsolete Domain Elimination | Clean all 24 obsolete domain occurrences (`job.v7m.org`, `app.v7m.org`, `staff.v7m.org`), configure Astro configs/SITE, promoter referral URLs, and specs | none | PLANNED |
| M2 | Security Headers, CSP, CORS & API Client Resilience | Fix Next.js CSP headers, add Astro `_headers`, standardize API envs, port socket retry & refresh mutex to API clients, configure CORS | M1 | PLANNED |
| M3 | Quality Suite & CI/CD Pipeline Rectification | Fix admin lint error, add `check-types` scripts, fix notify test placeholder, rectify deploy.yml | M2 | PLANNED |
| M4 | Final Milestone: Monorepo Quality & Build Verification | Validate full suite (`lint`, `check-types`, `test`, `build`), verify 0 `job.v7m.org` occurrences, run E2E validation | M3 | PLANNED |

---

## Interface Contracts

### Domain Routing & URL Scheme Contract
- `landing-promotor` (`maestri.group`):
  - Primary Site: `https://maestri.group`
  - App Destination (CTA): `https://app.maestri.group`
  - Contact Email: `contato@maestri.group`, DPO: `dpo@maestri.group`
- `app-promotor` (`app.maestri.group`):
  - Promoter Legal Base URL: `https://maestri.group`
  - Terms URL: `https://maestri.group/termos/`
  - Privacy URL: `https://maestri.group/privacidade/`
  - Promoter Referral Destination: `https://supletivo.net.br/?ref={id}`
- `landing-supletivo` (`supletivo.net.br`):
  - Primary Site: `https://supletivo.net.br`
  - Careers CTA (`CAREERS_URL`): `https://maestri.group`
  - App Destination: `https://app.supletivo.net.br`
- `app-supletivo` (`app.supletivo.net.br`):
  - Student App URL: `https://app.supletivo.net.br`
  - Staff / Promoter Hub URL: `https://app.maestri.group`
  - IBGE Address API: `https://servicodados.ibge.gov.br`
- `hub` (`hub.maestri.group`):
  - Portal URL: `https://hub.maestri.group`
- `admin` (`admin.maestri.group`):
  - Admin URL: `https://admin.maestri.group`
  - Hub Link: `https://hub.maestri.group`

### API Client Resilience Contract
- **TCP Reconnection**: All API clients catch `TypeError` on `fetch` and retry with `RETRY_DELAYS_MS = [250, 900]` before rejecting.
- **Refresh Mutex**: Concurrent 401 responses share a single pending refresh promise (`refreshPromise`) to prevent race condition invalidation.

---

## Code Layout

- `apps/landing-promotor/`: Astro 6 SSG promoter landing page
- `apps/app-promotor/`: Next.js 16 Standalone promoter workspace
- `apps/hub/`: Next.js 16 Standalone regional coordinator hub
- `apps/admin/`: Next.js 16 Standalone backoffice admin cockpit
- `apps/landing-supletivo/`: Astro 6 SSG student landing page
- `apps/app-supletivo/`: Next.js 16 Standalone student lead & portal
- `packages/api-client/`: Typed OpenAPI client SDK
- `packages/ui/`: Shared UI component library
- `services/backend/`: Django Ninja backend REST API
- `services/notify/`: Notification and WhatsApp microservice
- `.github/workflows/`: GitHub Actions CI/CD workflows
