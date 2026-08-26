## 2026-08-26T20:09:57Z

You are the Project Orchestrator for the V7M Turborepo stabilization and production-hardening mission.

Your working directory is: c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_orchestrator_1
The authoritative original request is recorded at: c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md
Workspace root: c:\Users\maestri33\dev\v7m

## Mission Overview
Stabilize and production-harden the V7M Turborepo monorepo at https://github.com/maestri33/platform-v7m:
- R1: Fix all lint errors so `pnpm turbo run lint` exits 0 monorepo-wide (especially the 258 errors in @v7m/admin).
- R2: Validate CI workflow (.github/workflows/ci.yml) ensuring quality, test-frontends, and test-backend configurations are completely valid.
- R3: Validate Changesets versioning strategy (`pnpm run version:check` exits 0, packages at `0.1.0-alpha.1`, backend/notify handled properly).
- R4: Repository hygiene: remove `seed.spec.ts`, consolidate docs under `docs/`, check specs, ensure .gitignore / no secrets or .env tracked.
- R5: Validate `pnpm turbo run build` succeeds for all 6 frontend apps (admin, app-promotor, app-supletivo, hub, landing-promotor, landing-supletivo).
- R6: Standardize and fix Dockerfiles for all 4 Next.js SSR apps (pnpm/turbo prune, healthcheck, public copy, multi-stage node:22-alpine standalone), and verify at least one builds with docker.
- Final commit and push to origin/main.

Maintain `progress.md` and `BRIEFING.md` in your working directory `.agents/teamwork_preview_orchestrator_1/` throughout execution.
When all acceptance criteria are met, report back your completion and victory claim to the sentinel.
