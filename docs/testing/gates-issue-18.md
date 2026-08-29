# Acceptance Gates Ledger — Issue #18 (Production CI/CD Multi-Container, Cloudflare 522 Resolution & 12-Domain Mesh)

> **Scope**: Issue #18 — ops(prod): go-live de producao, resolucao do erro 522 no cloudflare e homologacao dos 12 dominios  
> **Branch**: `18-cloudflare-mesh-522`  
> **Method**: Unlazy Completion & Verification Discipline  

---

## Gates Overview

| Gate ID | Title | Status |
|---|---|:---:|
| G1_WORKFLOW_MATRIX_6_APPS | deploy.yml builds all 6 containers (backend, notify, app-promotor, admin, hub, app-supletivo) | ✅ MET |
| G2_FRONTEND_DOCKERFILES | All 4 Next.js frontend apps have standalone Dockerfiles | ✅ MET |
| G3_PRODUCTION_DEPLOY_GUIDE | docs/deployment/production-deployment-guide.md exists and is complete | ✅ MET |
| G4_GOVERNANCE_ROADMAP_UPDATE | docs/operations/governance-and-release.md records Issue #18 | ✅ MET |
| G5_CHECK_TYPES | Type check in all packages exits 0 | ✅ MET |
| G6_LINT | ESLint across monorepo exits 0 | ✅ MET |
| G7_PYTEST_NOTIFY | Services/notify pytest exits 0 (274 passed) | ✅ MET |
| G8_PYTEST_BACKEND | Services/backend pytest exits 0 (347 passed) | ✅ MET |
| G9_VERSION_CHECK | Version integrity check exits 0 | ✅ MET |
| G10_CLOUDFLARE_DNS_ALIGNMENT | Wildcards and Hetzner legacy records eradicated; A records point to 51.79.77.31 | ✅ MET |
| G11_ORIGIN_PROBE_CONNECTIVITY | `pnpm run test:mesh:origin` passes with 8/8 OK (0 failures) | ✅ MET |
| G12_EDGE_PUBLIC_12_DOMAINS | `pnpm run test:mesh` passes with 12/12 OK (0 failures, Cloudflare 522 resolved) | ✅ MET |