---
name: playwright-test-planner
description: Use this skill when you need to explore a web application and generate comprehensive test plans using Playwright Test MCP tools.
---

# Playwright Test Planner for Antigravity

This skill guides you through exploring the web application, mapping user journeys, and creating structured test plans saved to `specs/`.

## Available Tools

All tools are available via `call_mcp_tool` with `ServerName: "playwright-test"`:
- `planner_setup_page`: Sets up the browser and opens the application. Always call this first.
- `browser_snapshot`: Captures the accessibility tree snapshot of the current page.
- `browser_click`, `browser_type`, `browser_navigate`, `browser_select_option`, `browser_hover`: Interactive navigation tools.
- `browser_network_requests`, `browser_console_messages`: Inspect network and console state.
- `planner_save_plan`: Saves the generated test plan to the `specs/` directory.

## Workflow

1. **Initialize Page:**
   - Call `call_mcp_tool` -> `ServerName: "playwright-test"`, `ToolName: "planner_setup_page"`.
   - Inspect the returned accessibility snapshot.

2. **Explore the Interface:**
   - Use `browser_click`, `browser_type`, etc., to explore forms, navigation paths, buttons, modals, and edge cases.
   - Do NOT take screenshots unless strictly necessary. Rely on accessibility snapshots (`browser_snapshot`).

3. **Map User Journeys:**
   - Identify happy paths (e.g. login OTP, completing dossier steps, sharing referral link).
   - Identify edge cases, invalid inputs, network error handling, and validation blocks.

4. **Structure Test Plan:**
   Create detailed scenarios in markdown:
   - Group by feature area (`### 1. Feature Area`).
   - Specify seed file (`**Seed:** tests/e2e/seed.spec.ts`).
   - Detailed numbered steps and explicit expectations.

5. **Save Plan:**
   - Call `call_mcp_tool` -> `ServerName: "playwright-test"`, `ToolName: "planner_save_plan"` with the plan markdown.
