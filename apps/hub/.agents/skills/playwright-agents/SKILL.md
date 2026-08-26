---
name: playwright-agents
description: >-
  Complete toolkit and orchestrator for Playwright Agentic Testing (Planner, Generator, and Healer).
  Use when the user asks to plan, generate, run, debug, or heal Playwright tests using autonomous agent loops.
---

# Playwright Agentic Suite

This skill provides full orchestration of Playwright's three specialized agents in Antigravity:

| Agent | Purpose | Primary MCP Tools |
| :--- | :--- | :--- |
| **Planner** | Explores application flows and outputs test plans | `planner_setup_page`, `browser_snapshot`, `browser_*`, `planner_save_plan` |
| **Generator** | Generates real `.spec.ts` test files from plans | `generator_setup_page`, `browser_*`, `generator_read_log`, `generator_write_test` |
| **Healer** | Debugs and fixes failing tests iteratively | `test_run`, `test_debug`, `browser_*`, code editing |

## Quick Usage

### 1. Plan Tests
```json
call_mcp_tool({
  "ServerName": "playwright-test",
  "ToolName": "planner_setup_page",
  "Arguments": {}
})
```
Explore DOM via `browser_snapshot`, then save plan with `planner_save_plan` to `specs/<suite>.plan.md`.

### 2. Generate Tests
```json
call_mcp_tool({
  "ServerName": "playwright-test",
  "ToolName": "generator_setup_page",
  "Arguments": {
    "plan": "Description of steps",
    "seedFile": "tests/e2e/seed.spec.ts",
    "project": "chromium"
  }
})
```
Execute actions, fetch log via `generator_read_log`, then save code via `generator_write_test`.

### 3. Run & Heal Tests
```json
call_mcp_tool({
  "ServerName": "playwright-test",
  "ToolName": "test_run",
  "Arguments": {
    "locations": ["tests/e2e"]
  }
})
```
If a test fails:
```json
call_mcp_tool({
  "ServerName": "playwright-test",
  "ToolName": "test_debug",
  "Arguments": {
    "test": {
      "id": "<failing-test-id>",
      "title": "<failing-test-title>"
    }
  }
})
```
Analyze cause, fix test file, and re-run `test_run`.
