# Diretrizes para Agentes de IA (Antigravity, Copilot, VS Code)

Este repositório está configurado para operar com agentes de IA autônomos para desenvolvimento e testes automatizados com Playwright.

## Servidor MCP de Testes (`playwright-test`)
O servidor MCP `playwright-test` está ativo e expõe as ferramentas:
- **Planejamento (`planner_*`)**: `planner_setup_page`, `planner_save_plan`
- **Geração (`generator_*`)**: `generator_setup_page`, `generator_read_log`, `generator_write_test`
- **Diagnóstico & Reparo (`healer` / `test_*`)**: `test_run`, `test_debug`, `test_list`
- **Automação de Browser (`browser_*`)**: navegação, snapshots, cliques, digitação, asserções visuais.

## Estrutura de Testes
- **Seed de inicialização:** `tests/e2e/seed.spec.ts`
- **Planos e especificações:** `specs/` (ex: `specs/*.md`)
- **Testes E2E:** `tests/e2e/*.spec.ts`
- **Testes Unitários:** `tests/unit/*.test.ts` (Vitest)

## Comandos Úteis
```bash
npm run build      # Gera dist/ estático
npm test           # Executa testes unitários (Vitest)
npm run test:e2e   # Executa testes E2E (Playwright)
```
