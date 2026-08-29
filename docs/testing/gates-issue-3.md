# Acceptance Gates Ledger — Issue #3 (Network Security & Ingress Audit)

> **Scope**: Issue #3 — `sec(infra): auditoria profunda de segurança em domínios, DNS, ingress e classificação de endpoints públicos vs privados`
> **Branch**: `3-sec-infra-audit`
> **Method**: Unlazy Completion & Verification Discipline

---

## Gates Overview

| Gate ID | Title | Oracle Command | Expected Match | Status |
|---|---|---|---|:---:|
| `G1_DOCKER_PORT_ISOLATION` | Docker Compose private ports bound to 127.0.0.1 | `node -e "const f=fs.readFileSync('docker-compose.yml','utf8'); assert(f.includes('127.0.0.1:\${REDIS_PORT:-6380}:6379') && f.includes('127.0.0.1:\${EVOLUTION_GO_PORT:-4000}:4000') && f.includes('127.0.0.1:\${NOTIFY_PORT:-8000}:8000') && f.includes('127.0.0.1:\${POSTGRES_PORT:-5432}:5432')); console.log('OK_DOCKER_ISOLATION')"` | `OK_DOCKER_ISOLATION` | ✅ MET |
| `G2_PROD_CSRF_PRESERVATION` | Preserve DEFAULT_CSRF_TRUSTED_ORIGINS in prod_settings.py | `node -e "const f=fs.readFileSync('services/backend/core/prod_settings.py','utf8'); assert(f.includes('DEFAULT_CSRF_TRUSTED_ORIGINS')); console.log('OK_CSRF_PRESERVED')"` | `OK_CSRF_PRESERVED` | ✅ MET |
| `G3_NOTIFY_SECRET_CLEANUP` | Default STALWART_ADMIN_PASSWORD to empty string | `node -e "const f=fs.readFileSync('services/notify/notify_server/settings.py','utf8'); assert(!f.includes('Vvm1993!))#') && f.includes('STALWART_ADMIN_PASSWORD = env(\"STALWART_ADMIN_PASSWORD\", default=\"\")')); console.log('OK_NOTIFY_SECRET')"` | `OK_NOTIFY_SECRET` | ✅ MET |
| `G4_LANDING_HSTS_PRELOAD` | Strict-Transport-Security in Astro landings _headers | `node -e "const f1=fs.readFileSync('apps/landing-promotor/public/_headers','utf8'); const f2=fs.readFileSync('apps/landing-supletivo/public/_headers','utf8'); assert(f1.includes('Strict-Transport-Security') && f2.includes('Strict-Transport-Security')); console.log('OK_HSTS_HEADERS')"` | `OK_HSTS_HEADERS` | ✅ MET |
| `G5_SECURITY_VERIFY_SCRIPT` | verify-network-security.mjs runs 85 checks with 0 failures | `node scripts/verify-network-security.mjs --local` | `Falhas (FAIL): 0` | ✅ MET |
| `G6_QA_AUDIT_SUITE_10` | Suite 10 integrated into run-all-audit.mjs | `node -e "const f=fs.readFileSync('tooling/qa-audit/run-all-audit.mjs','utf8'); assert(f.includes('10-network-security.mjs') && f.includes('10_network_security')); console.log('OK_SUITE_10')"` | `OK_SUITE_10` | ✅ MET |
| `G7_ROOT_PACKAGE_SCRIPTS` | Root package.json contains test:security scripts | `node -e "const f=JSON.parse(fs.readFileSync('package.json','utf8')); assert(f.scripts['test:security'] && f.scripts['test:security:local']); console.log('OK_SCRIPTS')"` | `OK_SCRIPTS` | ✅ MET |
| `G8_CANONICAL_DOCUMENTATION` | docs/deployment/network-mesh.md contains full matrix | `node -e "const f=fs.readFileSync('docs/deployment/network-mesh.md','utf8'); assert(f.includes('MATRIZ DE CLASSIFICAÇÃO') || f.includes('Matriz de Classificação')); console.log('OK_DOCS')"` | `OK_DOCS` | ✅ MET |
| `G9_CHECK_TYPES` | Type check in all packages exits 0 | `pnpm turbo run check-types` | `Tasks: 8 successful, 8 total` | ✅ MET |
| `G10_LINT` | ESLint across monorepo exits 0 | `pnpm turbo run lint` | `Tasks: 4 successful, 4 total` | ✅ MET |
| `G11_PYTEST_NOTIFY` | Services/notify pytest exits 0 | `cd services/notify && uv run pytest -v` | `270 passed` | ✅ MET |
| `G12_PYTEST_BACKEND` | Services/backend pytest exits 0 | `cd services/backend && uv run pytest -v -k \"not test_migration\"` | `347 passed` | ✅ MET |
| `G13_VERSION_CHECK` | Version integrity check exits 0 | `pnpm run version:check` | `100% sincronizados` | ✅ MET |
