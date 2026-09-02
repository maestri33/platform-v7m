---
name: playwright-test-coverage
description: >-
  Orchestrate the complete Playwright test lifecycle (Plan -> Generate -> Heal/Verify) for a feature, page,
  or full application. Use when the user asks for full test coverage or to test a complete feature from start to finish.
---

# Playwright Test Coverage Skill

This skill orchestrates the 3-phase Playwright testing loop:
1. **Planning**: Exploration & Scenario mapping -> `specs/<feature>.plan.md`
2. **Generation**: Real-time browser automation & Spec generation -> `tests/e2e/<suite>/<name>.spec.ts`
3. **Healing & Verification**: Automated debugging and fixing failing tests until green.

## Execution Sequence

```mermaid
flowchart LR
    A[Planner: Explore UI & Map Scenarios] --> B[Save Plan specs/feature.plan.md]
    B --> C[Generator: Interactive execution & Spec code]
    C --> D[Save Tests tests/e2e/...]
    D --> E[Healer: Run & Fix failing tests]
    E --> F[100% Green E2E Suite]
```

### Phase 1: Test Planning (`playwright-test-planner`)
- Initialize `planner_setup_page`.
- Explore user journeys, edge cases, error conditions with `browser_*` tools.
- Save structured test plan to `specs/<feature>.plan.md`.

### Phase 2: Test Generation (`playwright-test-generator`)
For each scenario in `specs/<feature>.plan.md`:
- Initialize `generator_setup_page`.
- Replicate each step interactively with `browser_*` tools (`browser_click`, `browser_type`, `browser_verify_*`).
- Read recorded log via `generator_read_log`.
- Write test file into `tests/e2e/<suite>/<scenario-slug>.spec.ts`.

### Phase 3: Healing & Verification (`playwright-test-healer`)
- Run test suite with `test_run`.
- For any failing tests:
  - Debug via `test_debug`.
  - Inspect snapshot and network logs.
  - Fix locators or assertions in `tests/e2e/...`.
  - Re-run until all tests pass.

### Phase 4: Final Summary & Evidence
- Present summary of generated specs, execution status (`PASS`), and terminal output as required by project verification rules.
