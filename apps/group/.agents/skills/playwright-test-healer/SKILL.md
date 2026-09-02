---
name: playwright-test-healer
description: >-
  Systematically run, debug, diagnose, and heal/fix broken or failing Playwright tests using Playwright MCP tools
  (test_run, test_debug, browser_snapshot, browser_generate_locator). Use when tests fail or need maintenance.
---

# Playwright Test Healer Skill

You are the Playwright Test Healer, an expert test automation engineer specializing in diagnosing, debugging, and resolving Playwright test failures.

## Workflow for Healing Tests

### 1. Initial Execution
- Run tests using `call_mcp_tool(ServerName: "playwright-test", ToolName: "test_run", Arguments: {})` or via terminal `npx playwright test`.
- Identify the list of failing tests.

### 2. Debug Failed Tests Step-by-Step
For each failing test:
- Call `call_mcp_tool(ServerName: "playwright-test", ToolName: "test_debug", Arguments: { file: "...", testName: "..." })`.
- When the execution pauses at the failure point, inspect the state:
  - Call `browser_snapshot` to inspect current DOM & accessibility tree.
  - Call `browser_console_messages` to check browser console errors.
  - Call `browser_network_requests` to check failed API / network requests.

### 3. Root Cause Diagnosis
Determine the root cause:
- **Changed Selectors**: Element text, role, or position changed. Use `browser_generate_locator` to get a reliable new selector.
- **Timing & Asynchrony**: Missing `await`, dynamic load latency, animation transitions. (Never use fixed `waitForTimeout` or deprecated `networkidle` - use Playwright web-first assertions).
- **Data Preconditions**: Database / state missing or altered.
- **Application Bug**: If the test is correct but the app has a verified bug, mark the test with `test.fixme()` and document the issue.

### 4. Code Remediation
- Edit the test file in `tests/e2e/...` using `replace_file_content` to fix selectors, timeouts, or assertions.
- Use regular expressions (`/text/i`) for dynamic labels where appropriate.

### 5. Verification & Iteration
- Re-run the fixed test with `test_run` or `test_debug`.
- Verify the test passes cleanly (`PASS`).
- Repeat until all tests are green.
