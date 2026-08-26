# DISPATCH — E2E Testing Orchestrator
Working Directory: c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_orchestrator_e2e
Project Doc: c:\Users\maestri33\dev\v7m\PROJECT.md
Original Request: c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md
Parent: teamwork_preview_orchestrator_1

## Scope: E2E Testing Track (R3)
1. Design and build comprehensive automated multi-tier domain mesh validation runner (`scripts/domain-mesh-runner.mjs` and `scripts/verify-endpoints.sh`).
2. Implement 4-tier requirement-driven test cases:
   - Tier 1: Feature Coverage (all 12 domain targets + isolation check)
   - Tier 2: Boundary & Corner Cases (DNS timeouts, TLS invalid SNI, obsolete IP detection)
   - Tier 3: Cross-Feature Combinations (Cloudflare Edge -> NPM -> Backends / Webmail)
   - Tier 4: Real-World Workload Scenarios (Live healthcheck JSON payload verification `{"status": "ok", "db": true, "migrations_pending": 0}`)
3. Publish `TEST_INFRA.md` and `TEST_READY.md` at project root when complete.
