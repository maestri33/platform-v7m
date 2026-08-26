---
name: playwright-planner
description: Especialista em planejamento de testes end-to-end (E2E) com Playwright. Navega e explora interfaces web via MCP do Playwright, mapeia fluxos de usuários, identifica casos de borda e documenta planos de teste estruturados no diretório specs/.
---

# Playwright Test Planner (Antigravity)

Este skill orienta a criação de planos de testes E2E abrangentes para aplicações web explorando a interface em tempo real com o servidor MCP `playwright-test`.

## Workflow de Planejamento

1. **Inicialização & Exploração**:
   - Chame a ferramenta `planner_setup_page` (ou `browser_navigate`) do MCP `playwright-test` para abrir a página inicial / alvo.
   - Use `browser_snapshot` para inspecionar a árvore DOM acessível e elementos visíveis.
   - Interaja com a página usando `browser_click`, `browser_type`, `browser_select_option` para descobrir rotas, formulários, botões, modais e estados de transição.

2. **Mapeamento de Jornadas do Usuário**:
   - **Happy Paths**: fluxos principais de sucesso da aplicação.
   - **Casos de Borda**: validações de formulário, inputs vazios ou mal formatados, restrições de permissão.
   - **Estados Assíncronos & Reativos**: respostas via HTMX, WebSockets, streaming de eventos e SSE.

3. **Estrutura do Plano de Teste (`specs/<feature>.md`)**:
   - Cada cenário de teste deve conter:
     - **Título claro e conciso**
     - **Seed**: arquivo base de inicialização (`tests/e2e/seed.spec.ts`)
     - **Passos detalhados numerados**
     - **Expectativas e critérios de validação (Assertions)**
     - **Isolamento de estado**: cenários devem ser independentes.

4. **Salvar o Plano**:
   - Utilize a ferramenta MCP `planner_save_plan` ou crie o arquivo Markdown diretamente em `specs/` seguindo as boas práticas do repositório.
