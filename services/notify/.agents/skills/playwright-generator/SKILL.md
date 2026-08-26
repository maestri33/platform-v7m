---
name: playwright-generator
description: Especialista em geração de testes Playwright E2E em TypeScript/JavaScript. Executa ações no navegador em tempo real via MCP, captura logs de execução e gera especificações robustas com localizadores semânticos e assertions web-first.
---

# Playwright Test Generator (Antigravity)

Este skill gera scripts de teste automatizados em TypeScript com Playwright (`tests/e2e/*.spec.ts`) a partir de planos de teste em `specs/`.

## Workflow de Geração

1. **Carregar o Plano de Teste**:
   - Leia o cenário especificado no arquivo de plano em `specs/`.
   - Inicialize o contexto da página usando `generator_setup_page` do servidor MCP `playwright-test`.

2. **Gravação e Execução ao Vivo**:
   - Para cada passo do plano de teste:
     - Execute a ação no navegador em tempo real usando as ferramentas MCP `browser_click`, `browser_type`, `browser_select_option`, `browser_press_key`, `browser_verify_*`.
     - Utilize a descrição do passo como contexto/intenção da ação.

3. **Leitura de Logs do Gerador**:
   - Obtenha o histórico e os localizadores gerados pelo Playwright chamando `generator_read_log`.

4. **Persistência do Arquivo de Teste**:
   - Gere o código TypeScript e salve em `tests/e2e/<scenario-name>.spec.ts` (ou via `generator_write_test`).
   - Siga as regras de boas práticas:
     - Utilize `test.describe(...)` para agrupar cenários.
     - Prefira localizadores acessíveis (`page.getByRole`, `page.getByLabel`, `page.getByPlaceholder`, `page.getByTestId`).
     - Adicione comentários com o passo correspondente acima de cada bloco de ação.
     - Utilize asserções web-first (`await expect(locator).toBeVisible()`).
     - Nunca utilize `waitForTimeout` arbitrário ou `waitForLoadState('networkidle')`.
