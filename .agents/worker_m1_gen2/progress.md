# Progress

Last visited: 2026-08-26T14:53:45Z

## Status
Completed Milestone 1: Domain Mesh Mapping & Obsolete Domain Elimination.

## Plan
1. [x] Setup worker DISPATCH.md, BRIEFING.md, progress.md.
2. [x] Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, and survey reports `explorer_survey_1/handoff.md`, `explorer_survey_2/handoff.md`.
3. [x] Run initial grep to inventory all obsolete domain references (`job.v7m.org`, `v7m.org`, etc.).
4. [x] Implement changes across all specified files:
   - `apps/landing-promotor` (`.env.example`, `src/config.ts`, `tests/unit/attribution.test.ts`, `README.md`)
   - `apps/app-promotor` (`.env.example`, `src/lib/auth/server.ts`, `src/lib/auth/roles.ts`, `src/components/layout/AppShell.tsx`, `deploy/BOOTSTRAP.md`)
   - `apps/admin` (`.env.example`, `src/components/dashboard/gestor-view-drawer.tsx`)
   - `apps/hub` (`README.md`)
   - `apps/app-supletivo` (`src/app/_lead/flow-data.ts`, `src/app/_lead/switcher.tsx`, `src/app/_lead/lead-api.ts`, `src/app/(funil)/painel/page.tsx`, `tests/e2e/lead-check.spec.ts`)
   - `ENVIRONMENT_SPECS.md`, `specs/e2e-app-promotor-deep.md`, `specs/e2e-promoter-portal.md`, `specs/e2e-admin-cockpit.md`
   - `services/notify` (`mail/templates/v7m.html`, `tests/test_mail_branding.py`)
5. [x] Verify zero residual `job.v7m.org` references across active repository files.
6. [x] Run unit tests for landing apps (`@v7m/landing-promotor`, `@v7m/landing-supletivo`).
7. [x] Write complete `handoff.md`.
8. [ ] Send completion message to parent.
