## 2026-08-26T15:20:19Z

You are Worker 2 (Milestone 1 Fix + Milestone 2 Implementation).
Your working directory is: c:\Users\maestri33\dev\v7m\.agents\worker_m2

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md at:
c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md

Also read PROJECT.md at:
c:\Users\maestri33\dev\v7m\PROJECT.md
and Challenger 2 handoff report at:
c:\Users\maestri33\dev\v7m\.agents\challenger_m1_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:

PART 1: Fix Milestone 1 Residuals:
1. `apps/app-promotor/tests/e2e/promoter-deep.spec.ts`:
   - Line 291: change regex from `/https:\/\/job\.v7m\.org\/\?ref=/i` to `/https:\/\/supletivo\.net\.br\/\?ref=/i`.
   - Line 94: update `"promotor.teste@v7m.org"` to `"promotor.teste@maestri.group"`.
2. Inspect any remaining files in `apps/app-promotor/tests/e2e/` and `apps/app-supletivo/tests/e2e/` to ensure 100% clean domain assertions.

PART 2: Implement Milestone 2 (Security Headers, CSP, CORS & API Client Resilience):
1. **Security Headers & CSP**:
   - In `apps/hub/next.config.ts`: fix `script-src` so `'unsafe-eval'` is ONLY included in development mode (`${isDev ? " 'unsafe-eval'" : ""}`), matching `app-promotor` and `app-supletivo`.
   - Ensure all Next.js apps (`app-promotor`, `app-supletivo`, `hub`, `admin`) have `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
   - Create `public/_headers` in both `apps/landing-promotor` and `apps/landing-supletivo` with strict security headers (CSP `frame-ancestors 'none'`, `nosniff`, `strict-origin-when-cross-origin`).
2. **API Client Resilience & Error Handling**:
   - In `apps/admin/src/lib/api.ts`: Add `RETRY_DELAYS_MS = [250, 900]` retry for `TypeError` (dead keep-alive socket reconnection) as done in `app-supletivo`. Add a single-flight mutex (`refreshPromise`) for token refresh calls to eliminate concurrent 401 race conditions.
   - In `apps/hub/src/lib/api-leadership.ts`: Add `RETRY_DELAYS_MS = [250, 900]` retry for `TypeError`, add `AbortSignal.timeout(12_000)`, and add a single-flight mutex for token refresh.
   - In `packages/api-client/src/index.ts`: Standardize resilience and refresh deduplication.
3. **CORS Configuration**:
   - In `services/backend/core/settings.py` / `prod_settings.py`: Ensure `CORS_ALLOWED_ORIGINS` default lists the 6 canonical frontends:
     `"https://maestri.group"`, `"https://www.maestri.group"`, `"https://app.maestri.group"`, `"https://hub.maestri.group"`, `"https://admin.maestri.group"`, `"https://supletivo.net.br"`, `"https://www.supletivo.net.br"`, `"https://app.supletivo.net.br"`.

Verification:
- Run unit tests: `pnpm --filter @v7m/landing-promotor test` and `pnpm --filter @v7m/landing-supletivo test`.
- Run ripgrep to verify no residual `job.v7m.org` exists in `apps/`.
- Verify TypeScript compilation where applicable.
- Deliver handoff report to `c:\Users\maestri33\dev\v7m\.agents\worker_m2\handoff.md` and send completion message.
