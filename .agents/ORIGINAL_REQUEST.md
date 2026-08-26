# Original User Request

## 2026-08-26T20:08:39Z

<USER_REQUEST>
Stabilize and production-harden the V7M Turborepo monorepo (educational platform) that was just pushed to GitHub at https://github.com/maestri33/platform-v7m. The monorepo has its first commit on `main` but CI is currently broken — lint fails with 258 errors in `@v7m/admin`, and the full pipeline has never been validated end-to-end. The goal is to make the monorepo CI-green, build-ready, and properly versioned so it can be deployed to production targets (Cloudflare Pages for Astro landings, Docker/GHCR for Next.js apps and DJango backends, Neon Postgres for migrations).

Working directory: c:\Users\maestri33\dev\v7m
Integrity mode: development

## Requirements

### R1. Fix all lint errors so that `pnpm turbo run lint` exits with code 0 across the entire monorepo

The `@v7m/admin` app (Next.js 16 with React Compiler) currently has 258 ESLint errors and 2818 warnings, primarily:
- `react-hooks/set-state-in-effect` — synchronous setState calls inside useEffect
- `react-hooks/exhaustive-deps` — missing dependencies in useEffect
- `react-hooks/incompatible-library` — TanStack Table's `useReactTable()` memoization warnings
- `@typescript-eslint/no-unused-vars` — unused imports in test files

Fix all 258 errors (the ones causing exit code 1). Warnings may be suppressed with targeted ESLint disable comments where fixing would require a major refactor, but errors must be resolved with actual code changes.

### R2. Validate that the CI workflow (`.github/workshops/ci.yml` or `.github/workflows/ci.yml`) would pass in a GitHub Actions environment

Ensure all three CI jobs would succeed:
1. *quality* — `pnpm turbo run lint check-types` must exit 0
2. *test-frontends* — `pnpm turbo run test` and `pnpm turbo run build` must exit 0
3. *test-backend* — The pytest suites in `services/backend` and `services/notify` must have valid test configurations (they require Postgres/Redis service containers, but the Django settings and pytest configs must be valid)

3## R3. Validate the versioning strategy with Changesets

The monorepo uses `@changesets/cli` with a `fixed` group in `.changeset/config.json` and custom scripts `version:check` / `version:bump`. Verify:
- All packages are at the same version (`0.1.0-alpha.1`)
- `pnpm run version:check` exits 0
- The `services/backend` and `services/notify` packages (which have no `package.json` version or are outside the JS workspace) are handled correctly or explicitly excluded from version checking

### R4. Clean up residual artifacts and ensure documentation is canonical

- Remove `seed.spec.ts` from the repository root (it's a stray file)
- Verify that all documentation is consolidated under `docs/` and that no stray documentation `.md` files exist outside of `README.md`, `CHANGELOG.md`, and package-local `README.md` files
- Ensure the `specs/` directory at the root is referenced properly or moved into `docs/specs/` if it's duplicated
- Verify `.gitignore` properly excludes sensitive files, and that no `.env` files or credentials are tracked

### R5. Validate that `pnpm turbo run build` succeeds for all frontend applications

All 6 frontend apps must produce valid build artifacts:
- `@v7m/admin` → `.next/`
- `@v7m/app-promotor` → `.next/`
- `@v7m/app-supletivo` → `.next/`
- `@v7m/hub` �j `.next/`
- `@v7m/landing-promotor` �j `dist/`
- `@v7m/landing-supletivo` �j `dist/`

### R6. Standardize and fix Dockerfiles for all 4 Next.js SSR apps

All 4 Next.js SSR apps (`admin`, `app-promotor`, `app-supletivo`, `hub`) have existing Dockerfiles but with inconsistencies that need fixing:
1. *Package manager mismatch*: Dockerfiles currently use `npm ci` with `package-lock.json`, but the monorepo uses `pnpm@10` workspaces. Either switch to `pnpm install --frozen-lockfile` with proper workspace context, or use `turbo prune` to generate a pruned monorepo context for each app's Docker build.
2. *Missing healthcheck*: `apps/admin/Dockerfile` lacks a `HEALTHCHECK` instruction — add one consistent with the other apps.
3. *Missing `public/` directory copy*: `apps/admin` and `apps/hub` don't copy `/app/public` to the runner stage — add this if the app has public assets.
4. *Consistent pattern*: Ensure all 4 Dockerfiles follow the same multi-stage pattern (`base` → `deps` → `builder` �j `runner`) with `node:22-alpine`, non-root user @nextjs` (UID 1001), and Next.js standalone output.

## Acceptance Criteria

3## Lint & Type Safety
- [ ] `pnpm turbo run lint` exits with code 0 (all packages)
- [ ] `npm turbo run check-types` exits with code 0 (all packages)
- [ ] No ESLint errors remain (warnings are acceptable if documented)

### Build Pipeline
- [ ] `pnpm turbo run build` exits with code 0 (all 6 frontend apps produce outputs)
- [ ] Each Next.js app has a `.next/` directory after build
- [ ] Each Astro landing has a `dist/` directory after build

### Versioning
- [ ] `pnpm run version:check` exits with code 0
- [ ] All workspace packages report version `0.1.0-alpha.1`

3## Repository Hygiene
- [ ] No stray `.md` documentation files in root (only `README.md` and `CHANGELOG.md`)J- [ ] No `.env` files or secrets tracked by git
- [ ] `seed.spec.ts` removed from root
- [ ] `git status` shows clean working tree after all changes

### Dockerfiles
- [ ] All 4 Next.js SSR Dockerfiles use `pnpm` or `turbo prune` instead of `npm ci`
- [ ] All 4 Next.js SSR Dockerfiles include a `HEALTHCHECK` instruction
- [ ] All 4 Next.js SSR Dockerfiles copy `public/` assets to the runner stage (if the app has any)
- [ ] At least one Dckerfile can be built successfully with `docker build` from the monorepo root

### CI Readiness
- [ ] `.github/workflows/ci.yml` uses correct commands that match actual package scripts
- [ ] `.github/workflows/deploy.yml` deploys only Astro landings to Cloudflare Pages (not Next.js SSR apps)
- [ ] All changes committed and pushed to `origin/main`
</USER_REQUEST>
