# Handoff Report — Explorer 2: Security Headers, CSP, CORS, Auth & API Survey

**Author**: Explorer 2 (Security Headers, CSP, CORS, Auth & API Survey)  
**Date**: 2026-08-26  
**Working Directory**: `c:\Users\maestri33\dev\v7m\.agents\explorer_survey_2`  
**Target Domain Mesh**:
- `maestri.group` & `www.maestri.group`: `apps/landing-promotor` (Astro 5)
- `app.maestri.group`: `apps/app-promotor` (Next.js 16)
- `hub.maestri.group`: `apps/hub` (Next.js 16)
- `admin.maestri.group`: `apps/admin` (Next.js 16)
- `supletivo.net.br` & `www.supletivo.net.br`: `apps/landing-supletivo` (Astro 5)
- `app.supletivo.net.br`: `apps/app-supletivo` (Next.js 16)
- **Elimination**: Complete detachment of `job.v7m.org` and legacy `v7m.org` routing from frontend applications.

---

## 1. Observation

Direct observations from source code, configuration files, and test files across the repository:

### 1.1 Security Headers, CSP, and CORS Configurations

1. **`apps/admin/next.config.ts` (lines 9–29, 41–49)**:
   - `URL_BACKEND`: `process.env.URL_BACKEND ?? "http://127.0.0.1:8001"`
   - `CSP`: `"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"`
   - `SECURITY_HEADERS`: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
   - `rewrites()`: `/api/:path*` -> `${URL_BACKEND}/api/:path*`, `/media/:path*` -> `${URL_BACKEND}/media/:path*`.
   - `allowedDevOrigins`: Not configured.

2. **`apps/app-promotor/next.config.ts` (lines 4–41)**:
   - `CSP`: `"default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'"`
   - `SECURITY_HEADERS`: CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`.
   - `rewrites()`: None (all API calls go via server-side `djangoFetch` in Next.js Server Components and Server Actions).
   - `allowedDevOrigins`: Not configured.

3. **`apps/app-supletivo/next.config.ts` (lines 9–58)**:
   - `URL_BACKEND`: `process.env.URL_BACKEND ?? "http://backend-web:8000"`
   - `CSP`: `"default-src 'self'; script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://servicodados.ibge.gov.br; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"`
   - `connect-src`: explicitly allows `https://servicodados.ibge.gov.br` for in-browser Brazilian IBGE address auto-completion.
   - `SECURITY_HEADERS`: CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=(), geolocation=()`, plus `/sw.js` cache-control.
   - `allowedDevOrigins`: `["10.1.30.34", "localhost", "127.0.0.1"]`.
   - `rewrites()`: `/api/:path*` -> `${URL_BACKEND}/api/:path*`, `/media/:path*` -> `${URL_BACKEND}/media/:path*`.

4. **`apps/hub/next.config.ts` (lines 4–46)**:
   - `URL_BACKEND`: `process.env.URL_BACKEND ?? process.env.HUB_BACKEND_ORIGIN ?? "http://127.0.0.1:8001"`
   - `CSP`: `"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"`
   - Note: `script-src` contains `'unsafe-eval'` unconditionally in production (unlike `app-supletivo` and `app-promotor` which condition on `isDev`).
   - `SECURITY_HEADERS`: CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
   - `allowedDevOrigins`: `["127.0.0.1", "localhost"]`.
   - `rewrites()`: `/api/:path*` -> `${URL_BACKEND}/api/:path*`, `/media/:path*` -> `${URL_BACKEND}/media/:path*`.

5. **`apps/landing-promotor` & `apps/landing-supletivo` (Astro 5)**:
   - Static builds output to `dist/`. No Next.js header runtime.
   - Headers on Cloudflare Pages require `_headers` or Cloudflare Pages HTTP header configuration for CSP (`frame-ancestors 'none'`, `connect-src 'self' https://www.google-analytics.com`).

6. **`services/backend/core/settings.py` & `prod_settings.py` (CORS & Hosts)**:
   - `CORS_ALLOWED_ORIGINS`: Loaded from environment via `env.list("CORS_ALLOWED_ORIGINS", default=[])`.
   - `CSRF_TRUSTED_ORIGINS`: In `prod_settings.py:24`: `CSRF_TRUSTED_ORIGINS = ["https://backend.v7m.live"]`.
   - `ALLOWED_HOSTS`: Loaded from `env.list("ALLOWED_HOSTS", default=[])`.

---

### 1.2 API Configurations, Clients & Resilience

1. **`packages/api-client/src/index.ts`**:
   - Implements `createApiClient` based on `openapi-fetch` and typed schemas (`schema.d.ts`).
   - Injects `Authorization: Bearer <token>` via `authMiddleware` onRequest.
   - Triggers `onUnauthorized()` callback on HTTP 401.

2. **`apps/admin/src/lib/`**:
   - `config.ts:6`: `export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";`
   - `config.ts:8`: `export const API_TIMEOUT_MS = 12_000;`
   - `api-client.ts`: Wraps `@v7m/api-client` with `API_BASE_URL`, `getAccessToken()`, and `onUnauthorized` redirect to `/login`.
   - `api.ts:43-75`: Custom `request<T>` with `AbortController` timeout (12s), `ApiError` class, and silent token refresh in `requestAuth` (`POST /api/v1/staff/auth/refresh`). Missing TCP connection retry on `TypeError`.

3. **`apps/app-promotor/src/lib/api/`**:
   - `config.ts:9`: `export const BACKEND_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";`
   - `client.ts:72-173`: Server-side `djangoFetch` with `server-only`, single-flight refresh mutex (`refreshPromise` against `/api/v1/collaborators/auth/refresh`), `DjangoError` class, and `AbortSignal.timeout(10_000)`. Missing connection retry on `TypeError`.

4. **`apps/app-supletivo/src/lib/`**:
   - `config.ts:6`: `export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";`
   - `config.ts:8`: `export const API_TIMEOUT_MS = 12_000;`
   - `api.ts:61-74`: Implements TCP socket reconnect resilience:
     ```ts
     const RETRY_DELAYS_MS = [250, 900];
     async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
       for (const delay of RETRY_DELAYS_MS) {
         try {
           return await requestOnce<T>(path, opts);
         } catch (err) {
           if (!(err instanceof TypeError)) throw err;
           await new Promise((resolve) => setTimeout(resolve, delay));
         }
       }
       return await requestOnce<T>(path, opts);
     }
     ```
   - Retries dead keep-alive connections on `TypeError`, silent refresh on 401 (`POST /api/v1/clients/auth/refresh`), and structured `ApiError`.

5. **`apps/hub/src/lib/`**:
   - `api-leadership.ts:14`: `const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1/leadership";`
   - `api-leadership.ts:30-90`: `request<T>` with 401 silent refresh (`POST /auth/refresh`), but missing `AbortSignal` timeout and missing `TypeError` retry.

---

### 1.3 Auth Flows, Cookie Scopes & Redirect Mechanisms

1. **Authentication Silos & Storage Scopes**:
   - **`admin.maestri.group`**: Staff OTP login (`/api/v1/staff/auth/login`). Tokens stored in `localStorage` (`staff.login`, `staff.session`). Local-only scope.
   - **`app.maestri.group`**: Promoter OTP login (`/api/v1/collaborators/auth/login`). Tokens stored in HttpOnly server-set cookies: `v7m_access` (15 min) and `v7m_refresh` (14 days) with `SameSite=Lax`, `path="/"`. Host-scoped (no `domain=.maestri.group`), avoiding session collisions with other apps.
   - **`hub.maestri.group`**: Coordinator OTP login (`/api/v1/leadership/auth/login`). Stored in `sessionStorage`/`localStorage` and host cookie `hub.access` (`SameSite=Lax; path=/`).
   - **`app.supletivo.net.br`**: Client/Student OTP login (`/api/v1/clients/auth/login`). Tokens stored in `localStorage` (`supletivo.login`, `supletivo.session`).

2. **Checkout Flow (`app.supletivo.net.br`)**:
   - In `apps/app-supletivo/src/app/_lead/lead-api.ts:337-350` and `screen-checkout.tsx`:
     - Calls `setLeadCheckout(method)` (`POST /api/v1/clients/lead/checkout`).
     - Backend generates gateway checkout session (Asaas / InfinitePay).
     - Returns `{ url: "https://..." }`.
     - Frontend navigates to payment gateway (`window.location.href = s.checkoutUrl`).
     - On return, `/painel` or `/checkout` queries `/api/v1/clients/lead/me` to resume or transition to `/matricula`.

---

### 1.4 Comprehensive Catalog of Obsolete Domain References (`job.v7m.org` & Legacy Domains)

The survey identified **24 distinct locations** requiring update to the new domain mesh:

| # | File Path | Line(s) | Current (Obsolete) Content | Required Target Domain / Fix |
|---|---|---|---|---|
| 1 | `apps/landing-promotor/astro.config.mjs` | 9 | `const SITE = env.SITE ?? 'https://job.v7m.org';` | `https://maestri.group` |
| 2 | `apps/landing-promotor/.env.example` | 5, 8 | `PUBLIC_APP_URL=https://app.v7m.org`<br>`SITE=https://job.v7m.org` | `PUBLIC_APP_URL=https://app.maestri.group`<br>`SITE=https://maestri.group` |
| 3 | `apps/landing-promotor/src/config.ts` | 14 | fallback `'https://app.v7m.org'` | `'https://app.maestri.group'` |
| 4 | `apps/landing-promotor/src/components/PixPhone.astro` | 49 | `<text ... class="pp-url">job.v7m.org</text>` | `<text ... class="pp-url">maestri.group</text>` |
| 5 | `apps/landing-promotor/tests/unit/attribution.test.ts` | 8 | `const APP = 'https://app.v7m.org';` | `const APP = 'https://app.maestri.group';` |
| 6 | `apps/landing-supletivo/src/config.ts` | 22 | `export const CAREERS_URL = 'https://job.v7m.org';` | `'https://maestri.group'` |
| 7 | `apps/landing-supletivo/src/components/Footer.astro` | 49 | `<a href={CAREERS_URL} ...>` | Points to `https://maestri.group` |
| 8 | `apps/app-promotor/.env.example` | 14 | `NEXT_PUBLIC_LEGAL_BASE_URL=https://job.v7m.org` | `https://maestri.group` |
| 9 | `apps/app-promotor/src/lib/public-config.ts` | 1 | fallback `"https://job.v7m.org"` | `"https://maestri.group"` |
| 10 | `apps/app-promotor/src/app/(app)/painel/page.tsx` | 105 | `candidateMe ? `https://job.v7m.org/?ref=${session.external_id}` : null` | `https://supletivo.net.br/?ref=${session.external_id}` |
| 11 | `apps/app-promotor/src/app/page.tsx` | 3 | Comment: `job.v7m.org` | `maestri.group` |
| 12 | `apps/app-promotor/src/app/dev-preview/DevStudio.tsx` | 49–55 | `refUrl: "https://job.v7m.org/?ref=..."` | `"https://supletivo.net.br/?ref=..."` |
| 13 | `apps/app-promotor/tests/e2e/otp-honesty.spec.ts` | 138, 142 | Expected `https://job.v7m.org/termos/`, `/privacidade/` | `https://maestri.group/termos/`, `/privacidade/` |
| 14 | `apps/app-promotor/tests/e2e/mock-backend.mjs` | 455 | `ref_url: "https://job.v7m.org/?ref=e2e"` | `"https://supletivo.net.br/?ref=e2e"` |
| 15 | `apps/app-promotor/tests/e2e/promoter-flow.spec.ts` | 49 | `hasText: "https://job.v7m.org/?ref=e2e"` | `hasText: "https://supletivo.net.br/?ref=e2e"` |
| 16 | `apps/admin/.env.example` | 1 | Comment: `admin.v7m.org` | `admin.maestri.group` |
| 17 | `apps/admin/src/components/dashboard/gestor-view-drawer.tsx` | 102, 109 | `https://hub.v7m.org` | `https://hub.maestri.group` |
| 18 | `apps/hub/README.md` | 1 | `hub.v7m.org` | `hub.maestri.group` |
| 19 | `apps/app-promotor/src/lib/auth/server.ts` | 23 | Comment: `hub.v7m.org` | `hub.maestri.group` |
| 20 | `apps/app-promotor/src/lib/auth/roles.ts` | 7 | Comment: `hub.v7m.org` | `hub.maestri.group` |
| 21 | `apps/app-promotor/src/components/layout/AppShell.tsx` | 11 | Comment: `hub.v7m.org` | `hub.maestri.group` |
| 22 | `apps/app-supletivo/src/app/_lead/flow-data.ts` | 177, 178 | `V7M_URL = "https://app.v7m.org"`, `EAD_URL = "https://ead.v7m.org"` | Remove/Redirect to `app.maestri.group` / `app.supletivo.net.br` |
| 23 | `apps/app-supletivo/src/app/_lead/flow-data.ts` | 240 | Trigger label: `Já é aluno → app.v7m.org` | `Já é aluno → app.supletivo.net.br` |
| 24 | `specs/e2e-app-promotor-deep.md` & `specs/e2e-promoter-portal.md` | multiple | `job.v7m.org` / `app.v7m.org` | `maestri.group` / `app.maestri.group` |

---

## 2. Logic Chain

1. **CSP & Security Headers Chain**:
   - Observations 1.1.1 through 1.1.4 establish that all 4 Next.js applications enforce `frame-ancestors 'none'` and strict CSP directives.
   - Observation 1.1.3 shows that `app-supletivo` requires `https://servicodados.ibge.gov.br` in `connect-src` because client-side address lookups hit the IBGE open API directly.
   - Observation 1.1.4 reveals that `apps/hub` has `'unsafe-eval'` active in production, whereas `apps/app-supletivo` and `apps/app-promotor` guard `'unsafe-eval'` with `isDev`.
   - Therefore, `apps/hub` CSP should be aligned to restrict `'unsafe-eval'` to development only.

2. **CORS & Proxying Architecture Chain**:
   - Observations 1.1.1, 1.1.3, and 1.1.4 demonstrate that `admin`, `app-supletivo`, and `hub` rewrite `/api/*` and `/media/*` on the server to `URL_BACKEND`.
   - Observation 1.2.3 demonstrates that `app-promotor` executes `djangoFetch` server-side inside Server Components / Actions.
   - Consequently, in standard user flow, the browser communicates exclusively with the Next.js origin (`same-origin`), avoiding cross-origin preflight requests and CORS overhead.
   - However, for direct calls, health checks, or dev environments, `CORS_ALLOWED_ORIGINS` in `services/backend/core/settings.py` must enumerate all 6 production frontend domains (`maestri.group`, `app.maestri.group`, `hub.maestri.group`, `admin.maestri.group`, `supletivo.net.br`, `app.supletivo.net.br`).

3. **API Client Resilience & Timeout Chain**:
   - Observation 1.2.4 demonstrates that `app-supletivo` implements `RETRY_DELAYS_MS = [250, 900]` specifically to recover from `TypeError` when edge reverse proxies (Caddy/Cloudflare) drop idle keep-alive sockets before the request reaches the server.
   - Observations 1.2.2 and 1.2.5 show that `admin` and `hub` lack this retry mechanism, meaning transient keep-alive socket drops will result in unhandled connection errors in the browser.
   - Observation 1.2.3 shows that `app-promotor` uses a single-flight mutex (`refreshPromise`) to prevent race conditions during concurrent 401 token rotations, whereas `admin` and `hub` do not deduplicate simultaneous refresh calls.
   - Therefore, standardizing resilience patterns (the `app-supletivo` socket retry + `app-promotor` refresh mutex) across all frontends and `@v7m/api-client` will ensure uniform robustness.

4. **Auth & Domain Isolation Chain**:
   - Observation 1.3.1 demonstrates that session storage across all apps is cleanly segregated by origin:
     - `admin.maestri.group` (Staff `localStorage`)
     - `hub.maestri.group` (Coordinator `sessionStorage` + host cookie)
     - `app.maestri.group` (Promoter HttpOnly host cookie `v7m_access`)
     - `app.supletivo.net.br` (Student `localStorage`)
   - Because no cookies set `domain=.maestri.group` or `domain=.supletivo.net.br`, there is zero risk of session pollution or cookie clobbering across subdomains.

5. **Legacy Domain Elimination Chain**:
   - Observations in Section 1.4 show that `job.v7m.org` is referenced in 24 places across landing configs, SVGs, fallbacks, share links, and E2E assertions.
   - Replacing these references with `maestri.group` (promoter recruitment landing / legal pages), `app.maestri.group` (promoter portal), and `supletivo.net.br` (student course landing / referral destination) completely severs `job.v7m.org` from the ecosystem.

---

## 3. Caveats

1. **Cloudflare Pages Static Headers**:
   - Astro apps (`landing-promotor`, `landing-supletivo`) output static HTML (`dist/`). Security headers for these static assets are governed at the CDN/Cloudflare Pages edge via a `public/_headers` file. If `public/_headers` is absent, Cloudflare Pages default headers apply.
2. **Third-Party Script Additions**:
   - If Google Tag Manager (`GTM_ID`) or Google Analytics is populated in environment variables for landing pages, CSP `script-src` and `connect-src` must include `https://www.googletagmanager.com` and `https://www.google-analytics.com`.
3. **Local Dev vs. Prod Endpoints**:
   - In local development, port mapping conventions are: Backend: `8001` (or `8000`), Admin: `3003`, Hub: `3002`, App Promotor: `3001`, App Supletivo: `3020`, Landings: `3000` / `4321`. All Next rewrites correctly use `URL_BACKEND` default `http://127.0.0.1:8001` or `http://127.0.0.1:8000`.

---

## 4. Conclusion

1. **Security Headers & CSP**:
   - All Next.js apps have robust baseline security headers (`frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).
   - Actionable fix required in `apps/hub/next.config.ts`: Conditionally enable `'unsafe-eval'` only in development mode (`${isDev ? " 'unsafe-eval'" : ""}`).
   - Actionable addition: Add `public/_headers` to `apps/landing-promotor` and `apps/landing-supletivo` to ensure Edge CDN serves matching CSP and security headers.
   - Actionable addition: Ensure `allowedDevOrigins` is defined across all 4 Next.js apps.

2. **API Configurations & Resilience**:
   - Standardize client environment variable naming across the monorepo: `URL_BACKEND` for server-side upstream proxy and `NEXT_PUBLIC_API_BASE_URL` for browser client endpoints.
   - Port `RETRY_DELAYS_MS = [250, 900]` retry logic on `TypeError` from `app-supletivo` to `admin` (`src/lib/api.ts`), `hub` (`src/lib/api-leadership.ts`), and `@v7m/api-client`.
   - Incorporate single-flight refresh mutex in all token refresh handlers to prevent parallel request token invalidation.

3. **Domain Mesh Realignment & `job.v7m.org` Eradication**:
   - Apply the 24 identified replacements across `apps/landing-promotor`, `apps/landing-supletivo`, `apps/app-promotor`, `apps/admin`, `apps/hub`, `apps/app-supletivo`, and their associated E2E test specs (`mock-backend.mjs`, `otp-honesty.spec.ts`, `promoter-flow.spec.ts`).

---

## 5. Verification Method

To independently verify these findings and confirm the domain mesh, headers, and API configurations after applying updates:

1. **Static Typecheck & Linting**:
   ```bash
   pnpm turbo run check-types lint
   ```
2. **Unit & Attribution Tests (Astro Landings)**:
   ```bash
   pnpm --filter @v7m/landing-promotor test
   pnpm --filter @v7m/landing-supletivo test
   ```
3. **Production Builds Validation (All 6 Frontends)**:
   ```bash
   pnpm turbo run build --filter=@v7m/landing-promotor --filter=@v7m/landing-supletivo --filter=@v7m/app-supletivo --filter=@v7m/app-promotor --filter=@v7m/hub --filter=@v7m/admin
   ```
4. **Search Verification for Zero Residual `job.v7m.org` References**:
   ```bash
   rg -i "job\.v7m\.org" apps/ packages/ services/ .github/
   ```
   *Expected outcome*: 0 matching lines found across all active source, config, and spec files.
