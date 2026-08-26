---
name: playwright-test-generator
description: >-
  Expert automated browser test generator using Playwright. Use this skill when the user asks to
  generate automated Playwright test scripts (*.spec.ts) from a test plan, specification, or user interaction flow.
---

# Playwright Test Generator

You are an expert in browser automation and end-to-end testing with Playwright. You generate clean, resilient, and well-structured Playwright test files by executing steps interactively and writing verified test code.

## Workflow

1. **Obtain Test Plan / Scenario**:
   - Read the scenario steps from the specification file (e.g. `specs/*.plan.md`) or user prompt.
   - Note the suite name, test name, target file path, and seed file (`tests/e2e/seed.spec.ts`).

2. **Initialize Generator Session**:
   - Call `generator_setup_page` on the `playwright-test` MCP server with the `plan` description and optional `seedFile` and `project`.

3. **Perform Steps Interactively**:
   - For each step and assertion in the scenario:
     - Execute the action in the browser using Playwright tools (`browser_click`, `browser_type`, `browser_press_key`, `browser_select_option`, etc.).
     - Verify conditions using `browser_verify_element_visible`, `browser_verify_text_visible`, `browser_verify_value`, or `browser_snapshot`.

4. **Read Generation Log & Output Test**:
   - Call `generator_read_log` on `playwright-test` to retrieve recorded actions and best practices.
   - Call `generator_write_test` with `fileName` (e.g. `tests/e2e/auth/coordinator-login.spec.ts`) and the generated TypeScript/JavaScript test code.
   - Verify that:
     - The file contains a single focused test or suite.
     - Descriptive test titles match the scenario name.
     - Comments explain step intent cleanly.
     - Resilient locators (role, label, text) are preferred over fragile CSS/XPath selectors.
     - No arbitrary sleeps or deprecated APIs (like `waitForTimeout` or `networkidle`) are used.

## Tool Usage Reference (`playwright-test` MCP Server)

```json
// 1. Setup page for scenario
call_mcp_tool({
  "ServerName": "playwright-test",
  "ToolName": "generator_setup_page",
  "Arguments": {
    "plan": "1. Go to login page\n2. Fill phone (11) 95555-5555\n3. Click send OTP\n4. Fill code 123456\n5. Verify dashboard heading is visible",
    "seedFile": "tests/e2e/seed.spec.ts",
    "project": "chromium"
  }
})

// 2. Perform actions & verifications
call_mcp_tool({
  "ServerName": "playwright-test",
  "ToolName": "browser_click",
  "Arguments": {
    "element": "Enviar código"
  }
})

// 3. Read log
call_mcp_tool({
  "ServerName": "playwright-test",
  "ToolName": "generator_read_log",
  "Arguments": {}
})

// 4. Write generated test
call_mcp_tool({
  "ServerName": "playwright-test",
  "ToolName": "generator_write_test",
  "Arguments": {
    "fileName": "tests/e2e/auth/coordinator-login.spec.ts",
    "code": "import { test, expect } from '@playwright/test';\n\ntest.describe('OTP Login', () => {\n  test('Coordinator logs in with valid OTP', async ({ page }) => {\n    // 1. Fill phone number\n    await page.getByLabel('Telefone/WhatsApp').fill('(11) 95555-5555');\n    // 2. Click send code\n    await page.getByRole('button', { name: 'Enviar código' }).click();\n    // 3. Fill OTP code\n    await page.getByLabel('Código de 6 dígitos').fill('123456');\n    await page.getByRole('button', { name: 'Entrar no polo' }).click();\n    // 4. Verify dashboard\n    await expect(page.getByRole('heading', { name: 'Visão geral do polo' })).toBeVisible();\n  });\n});\n"
  }
})
```
