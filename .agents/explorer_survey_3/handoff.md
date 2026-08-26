# Survey Report — CI/CD Pipelines, Deployment Configurations & Monorepo Quality Suite

**Explorer ID**: Explorer 3 (CI/CD, Deploy & Quality Suite Survey)  
**Target Monorepo**: V7M Platform Monorepo (`c:\Users\maestri33\dev\v7m`)  
**Date**: 2026-08-26  

---

## 1. Observation

Direct observations and evidence collected across the codebase, configuration files, and tool execution runs:

### A. CI/CD Workflows (`.github/workflows/`)
1. **`.github/workflows/deploy.yml`**:
   - **Trigger**: Push to `main` branch and version tags `v*`.
   - **Environment**: Node.js 22, pnpm 10.34.5, GitHub Actions cache for pnpm store and `.turbo`.
   - **Build Step**:
     ```bash
     pnpm turbo run build --filter=@v7m/landing-promotor --filter=@v7m/landing-supletivo --filter=@v7m/app-supletivo --filter=@v7m/app-promotor --filter=@v7m/hub --filter=@v7m/admin
     ```
   - **Deployment Steps (`cloudflare/wrangler-action@v3`)**:
     - `landing-promotor` -> `pages deploy apps/landing-promotor/dist --project-name=landing-promotor`
     - `landing-supletivo` -> `pages deploy apps/landing-supletivo/dist --project-name=landing-supletivo`
     - `app-supletivo` -> `pages deploy apps/app-supletivo/.next --project-name=app-supletivo`
     - `app-promotor` -> `pages deploy apps/app-promotor/.next --project-name=app-promotor`
     - `hub` -> `pages deploy apps/hub/.next --project-name=hub`
     - `admin` -> `pages deploy apps/admin/.next --project-name=admin`
   - **Crucial Findings in `deploy.yml`**:
     - `continue-on-error: true` is enabled on all 6 Cloudflare Pages deploy steps (lines 68, 77, 86, 95, 104, 113), which suppresses deployment errors in GitHub Actions.
     - Direct deployment of `.next` folders to Cloudflare Pages static hosting for Next.js applications (`app-supletivo`, `app-promotor`, `hub`, `admin`) is architecturally invalid because these applications run with `output: "standalone"` and require server-side route rewrites to `URL_BACKEND`.
     - Container build and push matrix (`build-and-push` job) builds `services/backend` and `services/notify` to GHCR (`ghcr.io/${{ github.repository }}/*`).
2. **`.github/workflows/ci.yml`**:
   - **`quality` job**: Runs `pnpm run version:check` (validates all 12 package versions against root `v0.1.0-alpha.1`) and `pnpm turbo run lint check-types`.
   - **`test-frontends` job**: Runs `pnpm turbo run test` and `pnpm turbo run build`.
   - **`test-backend` job**: Spawns `postgres:16-alpine` and `redis:7.4-alpine` service containers, creates isolated databases (`backend`, `notify`, `evolution`), and runs Pytest for `services/backend` and `services/notify` using `uv`.
3. **`.github/workflows/copilot-setup-steps.yml`**:
   - Uses `npm ci` and `npx run build` (mismatched with the monorepo's `pnpm` and `turbo` standards).

---

### B. Turborepo Configuration (`turbo.json`) & Quality Scripts
1. **Pipeline Configuration (`turbo.json`)**:
   - `build`: `dependsOn: ["^build"]`, `inputs: ["$TURBO_DEFAULT$", ".env*"]`, `outputs: [".next/**", "!.next/cache/**", "dist/**", "build/**"]`.
   - `lint`: `dependsOn: ["^lint"]`, `inputs: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "src/**/*.mjs", ".eslintrc*", "eslint.config.*"]`.
   - `check-types`: `dependsOn: ["^build"]`, `inputs: ["src/**/*.ts", "src/**/*.tsx", "tsconfig.json"]`.
   - `test`: `dependsOn: ["^build"]`, `inputs: ["src/**/*.tsx", "src/**/*.ts", "tests/**/*.ts", "tests/**/*.py"]`.
   - `test:e2e`: `cache: false`.
2. **Execution Results & Bottlenecks**:
   - **`pnpm turbo run build`**: PASS (All 6 frontends compile cleanly in ~1m54s, with 6/6 tasks successful).
   - **`pnpm turbo run lint`**: FAILS on `@v7m/admin#lint` due to an unhandled ESLint error at `apps/admin/src/app/api/copilotkit/route.ts:31:23` (`Unexpected any. Specify a different type @typescript-eslint/no-explicit-any`). Note: `landing-promotor` and `landing-supletivo` do not define a `"lint"` script in `package.json`.
   - **`pnpm turbo run check-types`**: NO-OP (`WARNING: No tasks were executed as part of this run`, 0 tasks executed) because none of the app/package `package.json` files define a `"check-types"` script (e.g., `tsc --noEmit`).
   - **`pnpm turbo run test`**: FAILS immediately because `services/notify/package.json` specifies `"test": "echo \"Error: no test specified\" && exit 1"`.
   - **Vitest Unit Tests**: Both Astro applications (`landing-promotor` and `landing-supletivo`) pass their unit test suites (`attribution.test.ts`, 24 tests total).
   - **Version Integrity**: `pnpm run version:check` passes with code 0 across all 12 workspaces.

---

### C. Domain Mesh Restructuring & Hosting Mappings
1. **Target Canonical Domain Matrix**:

| Application | Directory | Tech Stack | Build Artifact | Deployment Target / Cloudflare Project |
| :--- | :--- | :--- | :--- | :--- |
| **Landing Promotor** | `apps/landing-promotor` | Astro 6 (Static) | `dist` | Cloudflare Pages (`landing-promotor`) -> `maestri.group`, `www.maestri.group` |
| **App Promotor** | `apps/app-promotor` | Next.js 16 (Standalone) | `.next/standalone` | Edge/Container -> `app.maestri.group` |
| **Hub Gestor** | `apps/hub` | Next.js 16 (Standalone) | `.next/standalone` | Edge/Container -> `hub.maestri.group` |
| **Admin Cockpit** | `apps/admin` | Next.js 16 (Standalone) | `.next/standalone` | Edge/Container -> `admin.maestri.group` |
| **Landing Supletivo** | `apps/landing-supletivo` | Astro 6 (Static) | `dist` | Cloudflare Pages (`landing-supletivo`) -> `supletivo.net.br`, `www.supletivo.net.br` |
| **App Supletivo** | `apps/app-supletivo` | Next.js 16 (Standalone) | `.next/standalone` | Edge/Container -> `app.supletivo.net.br` |

2. **Obsolete Domain Findings to Remediate**:
   - `job.v7m.org` is referenced in `specs/e2e-app-promotor-deep.md` and `specs/e2e-promoter-portal.md`.
   - `ENVIRONMENT_SPECS.md` lists `https://app.v7m.org` for `landing-promotor`'s `PUBLIC_APP_URL` and `https://api.v7m.org` for backend URLs.
   - `staff.v7m.org` is referenced in `specs/e2e-admin-cockpit.md`.

---

## 2. Logic Chain

1. **Premise**: In CI/CD, all quality gates (`lint`, `check-types`, `test`, `build`) must execute deterministically and exit with code 0.
2. **Observation**: `pnpm turbo run test` fails due to `services/notify/package.json:10` (`exit 1`), and `pnpm turbo run lint` fails due to `apps/admin/src/app/api/copilotkit/route.ts:31` (`@typescript-eslint/no-explicit-any`).
3. **Inference**: CI/CD jobs will fail on fresh commits until `services/notify`'s test script is neutralized or replaced, and `apps/admin`'s TypeScript/ESLint annotation is fixed.
4. **Premise**: `check-types` is declared in `turbo.json` and in CI workflows to enforce TypeScript correctness.
5. **Observation**: None of the workspace `package.json` files contain a `"check-types"` script.
6. **Inference**: Typechecking is currently bypassed across the monorepo during CI execution (`0 tasks executed`), creating silent regressions risk.
7. **Premise**: Cloudflare Pages static deployment requires static HTML/CSS/JS assets.
8. **Observation**: `apps/landing-promotor` and `apps/landing-supletivo` produce `dist/` containing `index.html` and static bundles. `apps/app-supletivo`, `apps/app-promotor`, `apps/hub`, and `apps/admin` produce `.next/standalone` and configure dynamic API rewrites to `URL_BACKEND`.
9. **Inference**: While Astro landing pages deploy directly to Cloudflare Pages via `wrangler pages deploy apps/<landing>/dist`, deploying Next.js `.next` folders directly without an SSR adapter or running standalone containers will fail to serve pages and dynamic proxy rewrites.
10. **Premise**: Domain mesh requirements specify `maestri.group` for staff/promoters/hub/admin and `supletivo.net.br` for students/landing, eliminating `job.v7m.org`.
11. **Observation**: `ENVIRONMENT_SPECS.md` and specifications in `specs/` still cite `job.v7m.org`, `staff.v7m.org`, and `app.v7m.org`.
12. **Inference**: Environment specifications, documentation, and metadata need alignment with the 6 canonical domains.

---

## 3. Caveats

1. **Remote Cloudflare Account Access**: Actual Cloudflare Pages DNS and Custom Domain bindings require live Cloudflare dashboard/API access with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. **Next.js on Cloudflare Pages**: If the 4 Next.js apps (`app-promotor`, `hub`, `admin`, `app-supletivo`) are intended to run on Cloudflare Pages rather than Docker containers, they require `@cloudflare/next-on-pages` or OpenNext adapters due to `output: "standalone"` and server-side rewrites.
3. **Backend Database Migrations in CI**: In `ci.yml`, `services/backend` and `services/notify` test suites run against live PostgreSQL and Redis services; unit/integration tests require Postgres extensions and database schemas.

---

## 4. Conclusion

1. **Production Builds**: All 6 frontends compile successfully with Turborepo (`pnpm turbo run build` completes in < 2 minutes).
2. **Quality Suite Deficiencies Identified**:
   - `services/notify/package.json` has a placeholder `"test"` script that breaks `pnpm turbo run test`.
   - `apps/admin/src/app/api/copilotkit/route.ts` has a lint error breaking `pnpm turbo run lint`.
   - Workspace `package.json` files lack `"check-types": "tsc --noEmit"` scripts, causing `pnpm turbo run check-types` to execute 0 tasks.
   - Astro apps lack `"lint"` scripts in their `package.json`.
3. **CI/CD Deployment Configuration**:
   - `deploy.yml` uses `continue-on-error: true` across all deploy steps.
   - Astro apps deploy cleanly to Cloudflare Pages from `dist`.
   - Next.js standalone apps require either container hosting (as configured in `docker-compose.yml`) or Next.js edge adapter builds for Cloudflare Pages.
4. **Domain Mesh**: Clear mapping established for all 6 frontends across `maestri.group` and `supletivo.net.br`, with `job.v7m.org` identified for complete dissociation.

---

## 5. Verification Method

To independently verify these findings, run the following commands in sequence:

1. **Verify Version Integrity**:
   ```bash
   pnpm run version:check
   ```
   *Expected: All 12 packages report aligned version v0.1.0-alpha.1.*

2. **Verify Typecheck No-Op Behavior**:
   ```bash
   pnpm turbo run check-types
   ```
   *Expected: Outputs `WARNING: No tasks were executed as part of this run` (0 tasks).*

3. **Verify Lint Failure in Admin**:
   ```bash
   pnpm --filter @v7m/admin lint
   ```
   *Expected: Error in `apps/admin/src/app/api/copilotkit/route.ts:31` (`Unexpected any`).*

4. **Verify Test Failure in Notify**:
   ```bash
   pnpm turbo run test
   ```
   *Expected: Fails on `notify#test` with exit code 1.*

5. **Verify Astro Unit Tests Pass**:
   ```bash
   pnpm --filter @v7m/landing-promotor test
   pnpm --filter @v7m/landing-supletivo test
   ```
   *Expected: 13 passed for landing-promotor, 11 passed for landing-supletivo.*

6. **Verify Monorepo Production Build**:
   ```bash
   pnpm turbo run build
   ```
   *Expected: 6 successful build tasks.*
