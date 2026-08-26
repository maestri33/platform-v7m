## 2026-08-26T14:10:48Z

You are Worker 1 for Milestone 1: Domain Mesh Mapping & Obsolete Domain Elimination.
Your working directory is: c:\Users\maestri33\dev\v7m\.agents\worker_m1

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md at:
c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md

Also read PROJECT.md at:
c:\Users\maestri33\dev\v7m\PROJECT.md
and survey reports at:
c:\Users\maestri33\dev\v7m\.agents\explorer_survey_1\handoff.md
c:\Users\maestri33\dev\v7m\.agents\explorer_survey_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task (Milestone 1):
Implement all domain mesh replacements and eliminate all 24 obsolete domain occurrences across the monorepo:
1. `apps/landing-promotor`:
   - `astro.config.mjs`: fallback `SITE = env.SITE ?? 'https://maestri.group'`
   - `.env.example`: `PUBLIC_APP_URL=https://app.maestri.group`, `SITE=https://maestri.group`, emails `@maestri.group`
   - `src/config.ts`: fallback `https://app.maestri.group`, `contato@maestri.group`, `dpo@maestri.group`
   - `src/components/PixPhone.astro`: text `maestri.group`
   - `tests/unit/attribution.test.ts`: test URL `https://app.maestri.group`
2. `apps/landing-supletivo`:
   - `src/config.ts`: `CAREERS_URL = 'https://maestri.group'`
3. `apps/app-promotor`:
   - `.env.example`: `NEXT_PUBLIC_LEGAL_BASE_URL=https://maestri.group`
   - `src/lib/public-config.ts`: fallback `https://maestri.group`
   - `src/app/(app)/painel/page.tsx`: candidate referral URL `https://supletivo.net.br/?ref=${session.external_id}`
   - `src/app/dev-preview/DevStudio.tsx`: mock referral URLs `https://supletivo.net.br/?ref=...`
   - `tests/e2e/otp-honesty.spec.ts`: update legal URLs to `https://maestri.group/termos/`, `/privacidade/`
   - `tests/e2e/mock-backend.mjs`: `ref_url: "https://supletivo.net.br/?ref=e2e"`
   - `tests/e2e/promoter-flow.spec.ts`: `https://supletivo.net.br/?ref=e2e`
   - `src/lib/auth/server.ts`, `src/lib/auth/roles.ts`, `src/components/layout/AppShell.tsx`: update comments to `hub.maestri.group`
4. `apps/admin`:
   - `.env.example`: comment `admin.maestri.group`
   - `src/components/dashboard/gestor-view-drawer.tsx`: links to `https://hub.maestri.group`
5. `apps/hub`:
   - `README.md`: link `hub.maestri.group`
6. `apps/app-supletivo`:
   - `src/app/_lead/flow-data.ts`: `V7M_URL = "https://app.maestri.group"`, trigger label `Já é aluno → app.supletivo.net.br`
   - `src/app/_lead/use-lead-flow.ts`: update redirects accordingly
7. Specs and docs:
   - `ENVIRONMENT_SPECS.md`: replace legacy domains with `maestri.group` and `supletivo.net.br`
   - `specs/e2e-app-promotor-deep.md`, `specs/e2e-promoter-portal.md`, `specs/e2e-admin-cockpit.md`: update legacy domains

Verification:
- Run ripgrep check to ensure zero residual `job.v7m.org` references across the repository (excluding .agents/ logs).
- Run unit tests: `pnpm --filter @v7m/landing-promotor test` and `pnpm --filter @v7m/landing-supletivo test`.
- Write your complete handoff report to `c:\Users\maestri33\dev\v7m\.agents\worker_m1\handoff.md`.
- Send a message back with your summary and handoff path.
