# Progress — Worker 2 (M1 Fix + M2 Implementation)

Last visited: 2026-08-26T15:27:00Z

## Status: COMPLETE

### Completed Steps
- [x] Initialized DISPATCH.md, BRIEFING.md, and progress.md
- [x] Reviewed ORIGINAL_REQUEST.md, PROJECT.md, and Challenger 2 handoff report
- [x] Fixed M1 residual issues in `apps/app-promotor/tests/e2e/promoter-deep.spec.ts` (regex updated to `https://supletivo.net.br/?ref=` and email to `promotor.teste@maestri.group`). Verified no remaining obsolete domain references in any test specs.
- [x] Implemented M2 Security Headers & CSP:
  - [x] Fixed `apps/hub/next.config.ts` (conditional `'unsafe-eval'` for dev only)
  - [x] Verified `frame-ancestors 'none'`, `nosniff`, `strict-origin-when-cross-origin` across all 4 Next.js apps (`app-promotor`, `app-supletivo`, `hub`, `admin`)
  - [x] Created `public/_headers` in both `apps/landing-promotor` and `apps/landing-supletivo`
- [x] Implemented M2 API Client Resilience:
  - [x] Added `RETRY_DELAYS_MS = [250, 900]` retry loop + `refreshPromise` single-flight mutex to `apps/admin/src/lib/api.ts`
  - [x] Added `RETRY_DELAYS_MS = [250, 900]` retry loop + `AbortSignal.timeout(12_000)` + `refreshPromise` single-flight mutex to `apps/hub/src/lib/api-leadership.ts`
  - [x] Added `refreshPromise` single-flight mutex to `apps/app-supletivo/src/lib/api.ts`
  - [x] Standardized socket retry resilience and `TokenRefreshManager` single-flight mutex in `packages/api-client/src/index.ts`
- [x] Implemented M2 Backend CORS Configuration:
  - [x] Added `DEFAULT_CORS_ALLOWED_ORIGINS` with canonical frontends to `services/backend/core/settings.py`
- [x] Verification & Testing:
  - [x] Ran unit tests: `pnpm --filter @v7m/landing-promotor test` (13/13 passed)
  - [x] Ran unit tests: `pnpm --filter @v7m/landing-supletivo test` (11/11 passed)
  - [x] Ran branding tests: `pytest services/notify/tests/test_mail_branding.py` (5/5 passed)
  - [x] Ran typechecks: `@v7m/api-client`, `hub`, `app-supletivo`, `app-promotor`, `admin` (all 0 errors)
  - [x] Verified Python syntax: `services/backend/core/settings.py` and `prod_settings.py` (valid)
  - [x] Verified ripgrep: 0 occurrences of `job.v7m.org` or `job\.v7m` in `apps/`
- [x] Authored handoff report and sent completion message.
