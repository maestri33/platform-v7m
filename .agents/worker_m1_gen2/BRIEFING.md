# BRIEFING — 2026-08-26T14:53:30Z

## Mission
Implement all domain mesh replacements and eliminate all obsolete domain occurrences (`job.v7m.org`, `app.v7m.org`, `hub.v7m.org`, `admin.v7m.org`, `staff.v7m.org`, `ead.v7m.org`) across the monorepo for Milestone 1.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\maestri33\dev\v7m\.agents\worker_m1_gen2
- Original parent: 592ace65-59f7-40cc-87cd-d367fcbba54b
- Milestone: Milestone 1: Domain Mesh Mapping & Obsolete Domain Elimination

## 🔒 Key Constraints
- Genuine implementations only (no hardcoding, no facades, real behavior).
- Eliminate all legacy domain references (`job.v7m.org`) in production code, configs, tests, and specs.
- Do not modify files in `.agents/` except within our own folder `worker_m1_gen2/`.

## Current Parent
- Conversation ID: 592ace65-59f7-40cc-87cd-d367fcbba54b
- Updated: 2026-08-26T14:53:30Z

## Task Summary
- **What to build**: Full domain mesh mapping and complete elimination of legacy domains across all 6 frontends, notify templates, and specifications.
- **Success criteria**: 0 occurrences of `job.v7m.org` outside `.agents/` and legacy archives; all unit tests in `@v7m/landing-promotor` and `@v7m/landing-supletivo` passing 100%.
- **Interface contracts**: Domain routing contract in `PROJECT.md`.
- **Code layout**: Monorepo packages and apps.

## Key Decisions Made
- Updated all environment examples, configurations, and fallbacks to canonical domains (`maestri.group`, `app.maestri.group`, `hub.maestri.group`, `admin.maestri.group`, `supletivo.net.br`, `app.supletivo.net.br`).
- Updated email templates and test assertions in `services/notify`.
- Updated test URLs and mock assertions in landing, promotor, and supletivo test suites.

## Change Tracker
- **Files modified**:
  - `apps/landing-promotor/.env.example`: Updated fallback URLs and contact email to `@maestri.group`.
  - `apps/landing-promotor/src/config.ts`: Updated contact and DPO emails to `@maestri.group`.
  - `apps/landing-promotor/tests/unit/attribution.test.ts`: Updated `APP` test URL to `https://app.maestri.group`.
  - `apps/landing-promotor/README.md`: Updated documentation table.
  - `apps/app-promotor/.env.example`: Updated `NEXT_PUBLIC_LEGAL_BASE_URL` to `https://maestri.group`.
  - `apps/app-promotor/src/lib/auth/server.ts`: Updated comments to `hub.maestri.group`.
  - `apps/app-promotor/src/lib/auth/roles.ts`: Updated comments to `hub.maestri.group`.
  - `apps/app-promotor/src/components/layout/AppShell.tsx`: Updated comments to `hub.maestri.group`.
  - `apps/app-promotor/deploy/BOOTSTRAP.md`: Updated deployment documentation to `app.maestri.group`.
  - `apps/admin/.env.example`: Updated comments to `admin.maestri.group`.
  - `apps/admin/src/components/dashboard/gestor-view-drawer.tsx`: Updated Hub portal links to `https://hub.maestri.group`.
  - `apps/hub/README.md`: Updated portal link to `hub.maestri.group`.
  - `apps/app-supletivo/src/app/_lead/flow-data.ts`: Updated `V7M_URL` to `https://app.maestri.group`, `EAD_URL` to `https://app.supletivo.net.br`, and trigger label.
  - `apps/app-supletivo/src/app/_lead/switcher.tsx`: Updated helper text and comments to `app.supletivo.net.br`.
  - `apps/app-supletivo/src/app/_lead/lead-api.ts`: Updated comment to `app.maestri.group`.
  - `apps/app-supletivo/src/app/(funil)/painel/page.tsx`: Updated comment to `app.supletivo.net.br`.
  - `apps/app-supletivo/tests/e2e/lead-check.spec.ts`: Updated route interceptors and expected redirect URL to `https://app.maestri.group/login`.
  - `ENVIRONMENT_SPECS.md`: Updated CTA URLs and backend origin specs.
  - `specs/e2e-app-promotor-deep.md`: Updated title and email to `@maestri.group`.
  - `specs/e2e-promoter-portal.md`: Updated title.
  - `specs/e2e-admin-cockpit.md`: Updated title and domain.
  - `services/notify/mail/templates/v7m.html`: Updated footer links to `app.maestri.group` and `maestri.group`.
  - `services/notify/tests/test_mail_branding.py`: Updated branding assertion to `app.maestri.group` and `maestri.group/privacidade/`.
- **Build status**: PASS
- **Pending issues**: None

## Quality Status
- **Build/test result**: All 13 landing-promotor tests PASSED; all 11 landing-supletivo tests PASSED.
- **Lint status**: Clean
- **Tests added/modified**: Updated unit and E2E test assertions to new canonical domains.

## Loaded Skills
- None

## Artifact Index
- `handoff.md` — Final handoff report
- `progress.md` — Progress tracker and liveness heartbeat
- `DISPATCH.md` — Dispatch log
- `BRIEFING.md` — Agent working memory
