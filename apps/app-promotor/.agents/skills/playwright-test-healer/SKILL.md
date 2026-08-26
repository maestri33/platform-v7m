---
name: playwright-test-healer
description: Use this skill to systematically diagnose, debug, and fix failing Playwright E2E tests using Playwright Test MCP tools.
---

# Playwright Test Healer for Antigravity

This skill provides a structured methodology to diagnose and repair broken or flaky Playwright tests.

## Available Tools

All tools are available via `call_mcp_tool` with `ServerName: "playwright-test"`:
- `test_list`: Lists all available tests in the project.
- `test_run`: Runs all or specific tests and reports pass/fail status.
- `test_debug`: Runs a specific failing test in interactive debugging mode, pausing on failure.
- `browser_snapshot`, `browser_console_messages`, `browser_network_requests`: Inspects DOM, console errors, and HTTP network requests during failure.
- `browser_generate_locator`: Generates robust, resilient locators for elements on the failing page.

## Workflow

1. **Identify Failing Tests:**
   - Call `test_run` to execute tests and collect failure reports.

2. **Debug Failure:**
   - For each failing test, call `test_debug` to pause right at the failing assertion or action.

3. **Diagnose Root Cause:**
   - Call `browser_snapshot` to inspect the exact DOM structure.
   - Check `browser_console_messages` for client-side JavaScript errors.
   - Check `browser_network_requests` for 4xx/5xx API failures.
   - Use `browser_generate_locator` if the selector changed or broke.

4. **Remediate Code:**
   - Edit the test file to fix selector drifts, asynchronous timing issues, or changed backend response shapes.
   - Prefer semantic Playwright locators (`getByRole`, `getByText`, `getByLabel`).
   - Avoid `waitForTimeout` or deprecated `waitForNavigation`.

5. **Verify Fix:**
   - Re-run the test using `test_run` to confirm it passes cleanly.
