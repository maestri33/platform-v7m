---
trigger: always_on
---

# Playwright Agentic Integration Rules

When working on Playwright tests, test generation, test planning, or test debugging:
1. Always use the `playwright-test` MCP server tools (`call_mcp_tool` with `ServerName: "playwright-test"`).
2. For test planning: use `planner_setup_page` -> explore with `browser_*` -> save with `planner_save_plan` in `specs/`.
3. For test generation: use `generator_setup_page` -> execute actions -> read log with `generator_read_log` -> output with `generator_write_test` into `tests/e2e/`.
4. For test debugging / healing: run tests with `test_run` -> debug with `test_debug` -> fix test code -> re-run `test_run` to verify.
