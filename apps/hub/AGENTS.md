# Playwright Agentic Testing Guidelines & Workflows

This workspace is configured with native Playwright Agentic Testing via the `playwright-test` MCP server. The agent can operate across three specialized testing roles: **Planner**, **Generator**, and **Healer**.

## Available MCP Server

- **Server Name**: `playwright-test`
- **Tool Invocation**: Use `call_mcp_tool` with `ServerName: "playwright-test"` and the required `ToolName` and `Arguments`.

---

## 1. Test Planner (`playwright-test-planner`)
Use when planning test coverage, discovering application journeys, and creating test specifications.

- **Workflow**:
  1. Call `planner_setup_page` to initialize the browser environment.
  2. Explore DOM with `browser_snapshot` and navigate interactively using `browser_*` tools (`browser_navigate`, `browser_click`, `browser_type`, etc.).
  3. Design scenarios covering happy paths, edge cases, error states, and negative validations.
  4. Save structured plan using `planner_save_plan` into `specs/<feature>.plan.md`.

---

## 2. Test Generator (`playwright-test-generator`)
Use when converting test plans or user stories into executable Playwright test files (`.spec.ts`).

- **Workflow**:
  1. Read scenario steps from `specs/*.plan.md`.
  2. Call `generator_setup_page` with `plan`, `seedFile: "tests/e2e/seed.spec.ts"`, and `project: "chromium"`.
  3. Replay steps interactively via Playwright MCP tools (`browser_click`, `browser_type`, `browser_verify_*`).
  4. Call `generator_read_log` to fetch the recorded action logs and recommendations.
  5. Call `generator_write_test` to output the final `.spec.ts` file in `tests/e2e/`.

---

## 3. Test Healer (`playwright-test-healer`)
Use when diagnosing, debugging, and fixing failing Playwright tests.

- **Workflow**:
  1. Execute tests using `test_run` (filter by `locations` and `projects`).
  2. For any failure, trigger `test_debug` for the specific test ID.
  3. Investigate the failure using `browser_snapshot`, `browser_console_messages`, and `browser_network_requests`.
  4. Surgically edit the test file to fix broken locators, race conditions, or assertions.
  5. Re-run `test_run` to verify that the test suite passes green.
  6. If a failure represents an actual application defect, mark the test as `test.fixme()` with an explanatory comment.

---

## Best Practices
- Prefer user-facing semantic locators (`getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`).
- Do not use arbitrary timeouts (`waitForTimeout`) or deprecated network waits (`networkidle`).
- Keep test scenarios isolated and reproducible.
- Test plan files belong in `specs/`. Test spec files belong in `tests/e2e/`. Seed setup file is at `tests/e2e/seed.spec.ts`.
