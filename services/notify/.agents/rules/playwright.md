# Diretrizes e Boas Práticas para Playwright & Antigravity

## 1. Integração com MCP e Subagentes Playwright
O ecossistema Playwright está integrado ao Antigravity através de:
- **Servidor MCP `playwright-test`**: Fornece ferramentas de automação (`browser_*`), planejamento (`planner_*`), geração (`generator_*`) e execução/diagnóstico (`test_run`, `test_debug`).
- **Subagentes Nativos**: `playwright_planner`, `playwright_generator`, `playwright_healer`.
- **Skills de Projeto**: `.agents/skills/playwright-planner/`, `.agents/skills/playwright-generator/`, `.agents/skills/playwright-healer/`.

## 2. Estrutura de Arquivos de Teste
- **Planos de Teste**: Salvos em `specs/<feature>.md`.
- **Scripts de Teste E2E**: Salvos em `tests/e2e/<scenario>.spec.ts`.
- **Configuração Global**: `playwright.config.ts` na raiz do projeto (aponta para `baseURL: http://127.0.0.1:8000`).

## 3. Padrões de Código para Testes Playwright
- **Localizadores Acessíveis**: Priorize `getByRole()`, `getByLabel()`, `getByPlaceholder()` e `getByText()`.
- **Asserções Web-First**: Utilize `await expect(locator).toBeVisible()`, `await expect(locator).toHaveText(...)` em vez de checagens booleanas manuais.
- **Proibição de Esperas Artificiais**: Nunca utilize `page.waitForTimeout()` arbitrário ou `waitForLoadState('networkidle')`. Confie no auto-waiting e em seletores com estado (`toBeVisible()`, `toHaveCount()`).
- **Isolamento de Testes**: Cada teste deve ser autocontido e independente da ordem de execução.
