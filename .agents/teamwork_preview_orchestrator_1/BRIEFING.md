# BRIEFING — 2026-08-26T20:10:00Z

## Mission
Stabilize and production-harden the V7M Turborepo monorepo:
- R1: Fix all lint errors monorepo-wide (`pnpm turbo run lint` exits 0).
- R2: Validate CI workflow (`.github/workflows/ci.yml`).
- R3: Validate Changesets versioning strategy (`pnpm run version:check` exits 0, packages at `0.1.0-alpha.1`).
- R4: Repository hygiene (remove `seed.spec.ts`, docs consolidated under `docs/`, clean gitignore / no tracked secrets).
- R5: Validate `pnpm turbo run build` succeeds for all 6 frontend apps.
- R6: Standardize and fix Dockerfiles for all 4 Next.js SSR apps (pnpm/turbo prune, healthcheck, public copy, multi-stage node:22-alpine standalone), verify docker build.
- Final commit and push to origin/main.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_orchestrator_1
- Original parent: parent
- Original parent conversation ID: f55e9352-2caf-497a-99e8-60a7d8e01f48

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_orchestrator_1\PROJECT.md
1. **Decompose**: Survey monorepo with 3 parallel Explorers covering lint/build, CI/versioning/hygiene, and Dockerfiles/SSR. Formulate PROJECT.md with explicit milestones M1..M6 + Final Integration.
2. **Dispatch & Execute**:
   - Dual Track: Testing/Validation Track + Implementation Track.
   - Per milestone iteration: Explorer(3) -> Worker(1) -> Reviewer(2) -> Challenger(2) -> Auditor(1) -> Gate.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical, auditor NON-SKIPPABLE)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (last resort)
4. **Succession**: Self-succeed at 16 spawns. Write handoff.md, persist state, cancel timers, spawn successor.
- **Work items**:
  1. Survey & Monorepo Assessment [in-progress]
  2. M1: Lint & Type Safety Resolution (@v7m/admin & monorepo) [pending]
  3. M2: Repository Hygiene & Docs Consolidation [pending]
  4. M3: Versioning & Changesets Strategy Validation [pending]
  5. M4: CI/CD Workflow Hardening [pending]
  6. M5: Frontend Apps Build Validation [pending]
  7. M6: Dockerfiles Multi-stage Standalone Standardization [pending]
  8. Final Gate & Git Homologation [pending]
- **Current phase**: 0 (Survey)
- **Current focus**: Dispatching 3 Survey Explorers

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers.
- Audit is a binary veto (Clean required).
- Never reuse subagents after handoff delivery.
- All code changes must pass tests and builds 100%.

## Current Parent
- Conversation ID: f55e9352-2caf-497a-99e8-60a7d8e01f48
- Updated: not yet

## Key Decisions Made
- Initiating Survey phase with 3 parallel Explorers partitioned by domain:
  - Explorer 1: Lint errors in `@v7m/admin` and monorepo (`react-hooks`, `no-unused-vars`, etc.) + build configurations.
  - Explorer 2: CI workflow (.github/workflows/ci.yml), Changesets (`version:check`), repo hygiene (stray files, docs consolidation, `.gitignore`).
  - Explorer 3: Dockerfiles for 4 Next.js SSR apps (`admin`, `app-promotor`, `app-supletivo`, `hub`) with `turbo prune` / pnpm / standalone.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|

## Succession Status
- Succession required: no
- Spawn count: 0 / 16
- Pending subagents: none
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: not started
- Safety timer: none

## Artifact Index
- c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_orchestrator_1\BRIEFING.md — Persistent context & identity
- c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_orchestrator_1\progress.md — Execution & liveness tracker
- c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_orchestrator_1\DISPATCH.md — Verbatim input dispatch history
- c:\Users\maestri33\dev\v7m\.agents\teamwork_preview_orchestrator_1\PROJECT.md — Global architecture, feature inventory, milestones (to be created post-survey)
