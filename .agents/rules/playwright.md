---
trigger: model_decision
description: Diretrizes e padrões para desenvolvimento de testes E2E com Playwright no projeto.
---

# Diretrizes de Automação de Testes com Playwright

1. **Seletores Semânticos e Resilientes**:
   - Priorize sempre seletores com base em papéis acessíveis (`page.getByRole(...)`), rótulos (`getByLabel`), placeholders (`getByPlaceholder`) ou `data-testid` (`getByTestId`).
   - Evite seletores baseados em classes CSS instáveis (ex: classes do Tailwind com hashes dinâmicos) ou caminhos XPath absolutos.

2. **Auto-Waiting**:
   - Nunca use esperas arbitrárias (`page.waitForTimeout` / `sleep`). Confie no mecanismo de auto-waiting embutido do Playwright nas ações e asserções (`expect(locator).toBeVisible()`).

3. **Ambiente de Testes**:
   - Utilize a flag `TEST_MODE=1` ao realizar testes de autenticação por OTP (permitindo o código de bypass `000000`).
   - Mantenha os testes independentes e com isolamento de estado inicial.
