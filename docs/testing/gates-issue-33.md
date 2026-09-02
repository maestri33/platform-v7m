# Gates: Issue 33 - Portal Unico app.maestri.group

OWNS: apps/admin/src/**, apps/admin/tests/**

Scope: Consolidar portal unico de trabalho em app.maestri.group com funil instantaneo e navegacao cumulativa

- [x] G1: Typecheck no admin app sem erros
  CHECK: pnpm --filter @v7m/admin run check-types
  EXPECT: /tsc --noEmit/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\maestri33\dev\v7m\docs\testing; path=86820a716605/55 entries; EXPECT=matched; output-sha256=164710bda09b7b498ce16cac6ef2dd8c91f388245619bd6e676d4c18b9878981; output-bytes=94

- [x] G2: Linter ESLint 9 no admin app sem erros
  CHECK: pnpm --filter @v7m/admin run lint
  EXPECT: /eslint/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\maestri33\dev\v7m\docs\testing; path=86820a716605/55 entries; EXPECT=matched; output-sha256=96a5638abce2a360b7e81cb5787a623b23b2fd9a659fbbe466469edcbb70ece2; output-bytes=49612

- [x] G3: Testes E2E do Playwright cobrindo RBAC e Auth
  CHECK: pnpm --filter @v7m/admin test:e2e tests/e2e/portal-rbac.spec.ts tests/e2e/auth.spec.ts
  EXPECT: /7 passed/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\maestri33\dev\v7m\docs\testing; path=86820a716605/55 entries; EXPECT=matched; output-sha256=07f1e7608f14a98aaf38c7c7b973477ea3fd967b7a7b3b3b228d52ef4103d6dc; output-bytes=41079

- [x] G4: Build de producao standalone do admin app
  CHECK: pnpm --filter @v7m/admin run build
  EXPECT: /Compiled successfully/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\maestri33\dev\v7m\docs\testing; path=86820a716605/55 entries; EXPECT=matched; output-sha256=8d6a72590e1dfb869554c474726b06beb3e4cdcf01452f9ebd0ba4471166ad95; output-bytes=1598

- [x] G5: Integridade do versionamento global do monorepo
  CHECK: pnpm run version:check
  EXPECT: /100% sincronizados/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\maestri33\dev\v7m\docs\testing; path=86820a716605/55 entries; EXPECT=matched; output-sha256=f5d8953544c2fb545d59152b4e3b348e70174e4a0a2a6bde66598ef1053d42c4; output-bytes=776
