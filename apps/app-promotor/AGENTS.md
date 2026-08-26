<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Playwright Agents for Antigravity

This repository is equipped with Playwright Agents & MCP Tools (`playwright-test`):

- **Planner (`.agents/skills/playwright-test-planner`)**: Explores the app and drafts structured test plans in `specs/`. Uses `call_mcp_tool` (`ServerName: "playwright-test"`, `ToolName: "planner_setup_page"`, `planner_save_plan`).
- **Generator (`.agents/skills/playwright-test-generator`)**: Converts test scenarios from `specs/` into executable tests in `tests/e2e/`. Uses `generator_setup_page`, `browser_*`, `generator_read_log`, `generator_write_test`.
- **Healer (`.agents/skills/playwright-test-healer`)**: Diagnoses failing tests, captures DOM/console/network context, and fixes broken tests. Uses `test_run`, `test_debug`, `browser_generate_locator`.
