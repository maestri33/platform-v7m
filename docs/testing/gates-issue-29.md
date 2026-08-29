# Gates: Fix Docker Build Stages & Next.js Standalone (Issue #29)

OWNS: apps/app-supletivo/Dockerfile, apps/admin/Dockerfile, apps/admin/next.config.ts, .dockerignore, apps/admin/public/**

Scope: Fix Docker multi-stage build pipeline for Next.js apps with Turborepo and pnpm and ensure standalone builds succeed.

- [x] G1: App Supletivo Dockerfile builds Next.js standalone container successfully
  CHECK: docker build -f apps/app-supletivo/Dockerfile -t v7m-test-app-supletivo:local .
  EXPECT: naming to docker.io/library/v7m-test-app-supletivo:local
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\maestri33\dev\v7m; path=86820a716605/55 entries; EXPECT=matched; output-sha256=624940e929cf01c1cf39179b3fbdd648af4a1081582ae65719182fd737c4a451; output-bytes=4297

- [x] G2: Admin Dockerfile builds Next.js standalone container successfully
  CHECK: docker build -f apps/admin/Dockerfile -t v7m-test-admin:local .
  EXPECT: naming to docker.io/library/v7m-test-admin:local
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\maestri33\dev\v7m; path=86820a716605/55 entries; EXPECT=matched; output-sha256=5995060790f43cff756eda8546ab927997a0a68480a77d148ee986df827b53bb; output-bytes=8213

- [x] G3: Monorepo typecheck passes across all packages
  CHECK: pnpm turbo run check-types
  EXPECT: 6 successful, 6 total
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\maestri33\dev\v7m; path=86820a716605/55 entries; EXPECT=matched; output-sha256=436b862baae4bd9f3a55cbce330869e1f3001a817ef0373090c8a7ced58782ff; output-bytes=2160

- [x] G4: Package version consistency check passes
  CHECK: pnpm run version:check
  EXPECT: Sucesso: Todos os 10 pacotes e serviços estão 100% sincronizados
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\maestri33\dev\v7m; path=86820a716605/55 entries; EXPECT=matched; output-sha256=f5d8953544c2fb545d59152b4e3b348e70174e4a0a2a6bde66598ef1053d42c4; output-bytes=776
