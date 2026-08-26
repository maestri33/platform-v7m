# BRIEFING — 2026-08-26T15:27:00Z

## Mission
Fix Milestone 1 residual defects and implement Milestone 2 (Security Headers, CSP, CORS & API Client Resilience).

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\maestri33\dev\v7m\.agents\worker_m2
- Original parent: 592ace65-59f7-40cc-87cd-d367fcbba54b
- Milestone: M1-Fix + M2

## 🔒 Key Constraints
- DO NOT CHEAT: Genuine implementations only, no hardcoded test shortcuts or dummy facades.
- Minimal change principle: surgical modifications only.
- Strict adherence to domain mesh architecture in PROJECT.md.
- Ensure all tests pass.

## Current Parent
- Conversation ID: 592ace65-59f7-40cc-87cd-d367fcbba54b
- Updated: 2026-08-26T15:27:00Z

## Task Summary
- **What to build**:
  1. Fixed M1 residual defects in `apps/app-promotor/tests/e2e/promoter-deep.spec.ts` (email and referral regex). Verified zero residual obsolete domains.
  2. Implemented M2 Security Headers & CSP:
     - Fixed `apps/hub/next.config.ts` to include `'unsafe-eval'` only when `isDev` is true.
     - Verified all 4 Next.js apps enforce `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
     - Created `apps/landing-promotor/public/_headers` and `apps/landing-supletivo/public/_headers` with strict CSP and edge security headers.
  3. Implemented M2 API Client Resilience:
     - Added `RETRY_DELAYS_MS = [250, 900]` retry loop for `TypeError` (dead keep-alive socket reconnection) in `apps/admin/src/lib/api.ts` and `apps/hub/src/lib/api-leadership.ts`.
     - Added `AbortSignal.timeout(12_000)` in `apps/hub/src/lib/api-leadership.ts`.
     - Added single-flight mutex (`refreshPromise`) for token refresh calls in `apps/admin/src/lib/api.ts`, `apps/hub/src/lib/api-leadership.ts`, and `apps/app-supletivo/src/lib/api.ts`.
     - Standardized resilience and `TokenRefreshManager` single-flight mutex in `packages/api-client/src/index.ts`.
  4. Implemented M2 Backend CORS Configuration:
     - Configured `DEFAULT_CORS_ALLOWED_ORIGINS` in `services/backend/core/settings.py` containing the 6 canonical frontends and www variants.
- **Success criteria**:
  - 0 residual occurrences of `job.v7m.org` across `apps/`.
  - Passing vitest suites in `@v7m/landing-promotor` (13/13) and `@v7m/landing-supletivo` (11/11).
  - Passing pytest suite in `services/notify` (5/5 mail branding).
  - Clean TypeScript compilation across `@v7m/api-client`, `hub`, `admin`, `app-promotor`, `app-supletivo`.
- **Interface contracts**: PROJECT.md
- **Code layout**: PROJECT.md

## Change Tracker
- **Files modified**:
  - `apps/app-promotor/tests/e2e/promoter-deep.spec.ts`: Fixed referral regex and test email.
  - `apps/hub/next.config.ts`: Conditional unsafe-eval in CSP.
  - `apps/landing-promotor/public/_headers`: Cloudflare Pages security headers.
  - `apps/landing-supletivo/public/_headers`: Cloudflare Pages security headers.
  - `apps/admin/src/lib/api.ts`: Socket retry + refresh mutex.
  - `apps/hub/src/lib/api-leadership.ts`: Socket retry + timeout + refresh mutex.
  - `apps/app-supletivo/src/lib/api.ts`: Refresh mutex.
  - `packages/api-client/src/index.ts`: Resilient fetch + single-flight refresh manager.
  - `services/backend/core/settings.py`: Default canonical CORS allowed origins.
- **Build status**: Pass
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (vitest, pytest, tsc)
- **Lint status**: Clean
- **Tests added/modified**: `promoter-deep.spec.ts`

## Loaded Skills
- None

## Key Decisions Made
- Used native Web standard `new Request(request, { headers })` in `@v7m/api-client` for seamless typing with `openapi-fetch`.
- Unified `refreshPromise` single-flight mutex pattern across all frontend API clients to prevent race conditions during JWT refresh.

## Artifact Index
- `.agents/worker_m2/DISPATCH.md` — Assignment
- `.agents/worker_m2/BRIEFING.md` — Working memory
- `.agents/worker_m2/progress.md` — Progress tracker
- `.agents/worker_m2/handoff.md` — Final handoff report
