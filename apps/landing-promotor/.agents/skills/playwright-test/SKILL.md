---
name: playwright-test
description: Playwright Agentic Testing Suite (Planner, Generator, Healer) using the official playwright-test MCP server. Use to plan test scenarios, generate robust Playwright specs, or debug and heal broken tests.
---

# Playwright Test Agent Suite

Este skill integra os três agentes autônomos do Playwright (`planner`, `generator` e `healer`) com o Antigravity via MCP (`playwright-test`).

## Configuração do Projeto
- **Seed test:** `tests/e2e/seed.spec.ts` (carrega a base da aplicação para os agentes).
- **Especificações e Planos:** Salvos em `specs/` (ex.: `specs/*.md`).
- **Testes E2E:** Gerados em `tests/e2e/*.spec.ts`.
- **Servidor Local:** `npm run preview` rodando em `http://localhost:4321` (requer `npm run build`).

## Fluxos de Trabalho

### 1. Planejador de Testes (Planner)
1. Inicie a página chamando a ferramenta MCP `playwright-test/planner_setup_page`.
2. Explore a interface via `playwright-test/browser_snapshot` e ações do navegador.
3. Mapeie os fluxos de usuário, caminhos felizes e casos de borda.
4. Salve o plano em Markdown chamando `playwright-test/planner_save_plan`.

### 2. Gerador de Testes (Generator)
1. Para cada cenário definido no plano em `specs/`:
2. Chame `playwright-test/generator_setup_page`.
3. Execute interativamente as ações e asserções necessárias usando as ferramentas `browser_*`.
4. Leia o log de execução com `playwright-test/generator_read_log`.
5. Gere e salve o arquivo de teste chamando `playwright-test/generator_write_test`.

### 3. Reparador de Testes (Healer)
1. Execute os testes com `playwright-test/test_run` ou `test_list`.
2. Para cada falha, inicie a depuração com `playwright-test/test_debug`.
3. Analise o DOM e snapshots com `browser_snapshot` e `browser_generate_locator`.
4. Corrija os seletores ou asserções e valide até passar.
