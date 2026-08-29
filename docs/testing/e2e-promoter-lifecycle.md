# Gates: Fix Docker Build Stages & Next.js Standalone (Issue #29)

OWNS: apps/app-supletivo/Dockerfile, apps/admin/Dockerfile, apps/admin/next.config.ts

Scope: Fix Docker multi-stage build pipeline for Next.js apps with Turborepo and pnpm and ensure standalone builds succeed.

- [ ] G1: App Supletivo Dockerfile builds Next.js standalone container successfully
  CHECK: docker build -f apps/app-supletivo/Dockerfile -t v7m-test-app-supletivo:local .
  EXPECT: naming to docker.io/library/v7m-test-app-supletivo:local
  EVIDENCE: pending

- [ ] G2: Admin Dockerfile builds Next.js standalone container successfully
  CHECK: docker build -f apps/admin/Dockerfile -t v7m-test-admin:local .
  EXPECT: naming to docker.io/library/v7m-test-admin:local
  EVIDENCE: border

- [ ] G3: Monorepo typecheck passes across all packages
  CHECK: pnpm turbo run check-types
  EXPECT: 8 successful, 8 total
  EVIDENCE: pending

- [ ] G4: Package version consistency check passes
  CHECK: pnpm run version:check
  EXPECT: Version check passed
  EVIDENCE: pending
