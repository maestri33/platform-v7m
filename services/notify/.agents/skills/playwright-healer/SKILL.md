---
name: playwright-healer
description: Especialista em depuração e auto-recuperação (healing) de testes Playwright. Executa suítes de teste via MCP/CLI, diagnostica falhas, inspeciona snapshots do DOM/tela, corrige seletores quebrados ou asserções desatualizadas e revalida até a aprovação total.
---

# Playwright Test Healer (Antigravity)

Este skill é acionado quando testes E2E falham ou se tornam flaky devido a alterações na interface, seletores modificados ou regras de negócio atualizadas.

## Workflow de Diagnóstico e Correção (Healing)

1. **Execução e Identificação de Falhas**:
   - Execute a suíte ou teste específico usando `test_run` do MCP `playwright-test` ou via CLI `npx playwright test`.
   - Identifique quais cenários ou arquivos falharam.

2. **Depuração Interativa**:
   - Execute o teste falho em modo de depuração usando `test_debug`.
   - Quando pausar no erro, inspecione a tela e a estrutura acessível via `browser_snapshot` e `browser_console_messages`.

3. **Análise de Causa Raiz**:
   - O seletor CSS / texto do botão mudou?
   - Houve mudança na resposta de uma chamada HTMX ou endpoint assíncrono?
   - Há problemas de sincronização ou condições de corrida?
   - O comportamento da aplicação mudou legitimamente?

4. **Remediação do Código**:
   - Ajuste o teste em `tests/e2e/*.spec.ts`:
     - Troque seletores frágeis por localizadores semânticos do Playwright (`page.getByRole(...)`, `page.getByLabel(...)`, `page.getByText(...)`).
     - Para valores dinâmicos (UUIDs, timestamps), utilize expressões regulares (`new RegExp(...)`).
     - Corrija valores esperados nas asserções (`expect(...)`).

5. **Revalidação**:
   - Reexecute o teste modificado até passar de forma consistente e limpa (código 0).
   - Se uma falha for identificada como um bug real pendente na aplicação (e não um teste incorreto), marque como `test.fixme()` com comentário explicativo.
