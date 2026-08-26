---
name: playwright-test-generator
description: Use this skill to automatically generate robust Playwright TypeScript E2E tests from test plans in specs/ using Playwright Test MCP tools.
---

# Playwright Test Generator for Antigravity

This skill converts markdown test plan scenarios in `specs/` into executed, verified TypeScript test files in `tests/e2e/`.

## Available Tools

All tools are available via `call_mcp_tool` with `ServerName: "playwright-test"`:
- `generator_setup_page`: Sets up the page and seeds for a specific test scenario.
- `browser_*`: Interactive browser automation tools (`browser_click`, `browser_type`, `browser_verify_element_visible`, etc.).
- `generator_read_log`: Reads recorded browser action log and generated code.
- `generator_write_test`: Writes the generated Playwright test file to disk.

## Workflow

1. **Read Test Plan:**
   - Read the relevant scenario from `specs/<plan>.md`.

2. **Setup Scenario:**
   - Call `generator_setup_page` with the scenario details.

3. **Step-by-Step Execution:**
   - For each step in the scenario, call the corresponding `browser_*` tool.
   - Use verification tools (`browser_verify_element_visible`, `browser_verify_text_visible`, etc.) for assertions.

4. **Retrieve Generator Log:**
   - Call `generator_read_log` to obtain the full execution trace and best-practice locator suggestions.

5. **Write Test File:**
   - Call `generator_write_test` to output the final `.spec.ts` test in `tests/e2e/`.
   - Ensure the test matches standard conventions:
     - Clear `test.describe(...)` matching the plan group.
     - Comments above each action step matching the test plan.
     - Resilient locators (role, text, label) instead of fragile CSS selectors.
