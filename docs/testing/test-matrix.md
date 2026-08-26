# E2E Test Infra: V7M Domain Mesh & Frontend Suite

## Test Philosophy
- Opaque-box, requirement-driven.
- Verifies exact domain routing, HTTP security headers, CORS origins, API client reconnect behaviors, and monorepo build/test execution.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Cross-Feature Combinations + Production Compilation.

## Feature Inventory & Test Coverage
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Eradicate `job.v7m.org` references | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 2 | Canonical Domain Mapping `maestri.group` | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 3 | Canonical Domain Mapping `supletivo.net.br` | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 4 | Hub & Admin Domain Realignment | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 5 | Promoter Referral Link Fix | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 6 | Specs & Documentation Alignment | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 7 | Next.js CSP & Security Headers Hardening | ORIGINAL_REQUEST §2 | 5 | 5 | ✓ |
| 8 | Astro Landings Edge Headers (`_headers`) | ORIGINAL_REQUEST §2 | 5 | 5 | ✓ |
| 9 | API Client Socket Reconnect Resilience | ORIGINAL_REQUEST §2, §3 | 5 | 5 | ✓ |
| 10 | Single-Flight Token Refresh Mutex | ORIGINAL_REQUEST §2, §3 | 5 | 5 | ✓ |
| 11 | Backend CORS Origins Alignment | ORIGINAL_REQUEST §2 | 5 | 5 | ✓ |
| 12 | TypeScript & ESLint Lint Error Fix | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 13 | Monorepo `check-types` Implementation | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 14 | Workspace Test Script Neutralization | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 15 | CI/CD & Deploy Workflow Rectification | ORIGINAL_REQUEST §2, §3 | 5 | 5 | ✓ |
| 16 | 100% Quality & Build Verification | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |

## Test Architecture
- **Static Domain & Config Verification**: Ripgrep analysis ensuring 0 occurrences of `job.v7m.org`.
- **Static Typecheck Validation**: `pnpm turbo run check-types` executing `tsc --noEmit` across all apps and packages.
- **Linter Validation**: `pnpm turbo run lint` executing across all workspaces.
- **Unit & Component Testing**: `pnpm turbo run test` executing Astro & package unit tests.
- **Production Build Compilation**: `pnpm turbo run build` compiling all 6 frontends cleanly.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Promoter signs up on `maestri.group`, navigates to `app.maestri.group`, gets student referral link pointing to `supletivo.net.br/?ref={id}` | F1, F2, F3, F5 | High |
| 2 | Coordinator accesses `hub.maestri.group` and executive accesses `admin.maestri.group`, links and drawers resolve correctly without cross-domain cookie collisions | F4, F7, F10 | Medium |
| 3 | Student accesses `supletivo.net.br`, navigates to `app.supletivo.net.br`, uses IBGE address lookup via CSP `connect-src` | F3, F7, F8, F9 | High |
| 4 | API client experiences transient TCP disconnect, executes `RETRY_DELAYS_MS` retry, successfully re-establishes connection | F9, F10, F11 | High |
| 5 | Full CI/CD quality gate and production deployment compilation | F12, F13, F14, F15, F16 | High |
