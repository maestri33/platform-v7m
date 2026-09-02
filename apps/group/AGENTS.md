# Agent Guidelines & Workspaces Rules

## Overview
This repository (`admin-v7m`) is a Next.js / TypeScript web application with automated end-to-end testing powered by Playwright and AI Testing Agents.

---

## 🎭 Playwright Testing Agents Suite

This workspace is integrated with Playwright Testing Agents and Antigravity's MCP system (`playwright-test`). Whenever the user asks to plan, generate, heal, or test features, follow these workflows:

### 1. Test Planner (`playwright-test-planner`)
- **When**: "Crie um plano de testes para...", "Mapeie os cenários da página...", "Planejar testes de..."
- **MCP Tools**: `planner_setup_page`, `planner_save_plan`, `browser_*`
- **Output**: Structured markdown plan saved in `specs/<feature>.plan.md`.

### 2. Test Generator (`playwright-test-generator`)
- **When**: "Gere os testes do plano...", "Crie o teste E2E para o cenário X..."
- **MCP Tools**: `generator_setup_page`, `browser_*`, `generator_read_log`, `generator_write_test`
- **Output**: Test spec files saved in `tests/e2e/<suite>/<scenario>.spec.ts`.

### 3. Test Healer (`playwright-test-healer`)
- **When**: "Corrija os testes que estão falhando", "Debugue e arrume o teste X", "Heal tests"
- **MCP Tools**: `test_run`, `test_debug`, `browser_snapshot`, `browser_generate_locator`, `browser_console_messages`
- **Output**: Fixed, robust tests with updated locators/assertions verified green.

### 4. Full Test Coverage Loop (`playwright-test-coverage`)
- **When**: "Crie cobertura completa de testes E2E para [feature]"
- **Workflow**: Runs Planner -> Generates all specs -> Heals and verifies 100% pass rate.

---

## 🔄 Dual Agent Loop Support: Antigravity & VS Code (`--loop=vscode`)

Este repositório está configurado para operar de forma híbrida e transparente em ambos os ambientes:

1. **Google Antigravity (IA Principal)**:
   - Utiliza as skills em `.agents/skills/` (`playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer`, `playwright-test-coverage`).
   - Conecta-se às ferramentas MCP nativas via `playwright-test` (`planner_setup_page`, `generator_setup_page`, `test_run`, `browser_*`).
   - Orquestra subagentes concorrentes para cobertura e validação.

2. **VS Code / GitHub Copilot Agent Mode (`npx playwright init-agents --loop=vscode`)**:
   - Definições de agentes sincronizadas em `.github/agents/`:
     - `.github/agents/playwright-test-planner.agent.md`
     - `.github/agents/playwright-test-generator.agent.md`
     - `.github/agents/playwright-test-healer.agent.md`
   - Configuração de MCP compatível em `.vscode/mcp.json` (`playwright run-test-mcp-server`).
   - Script rápido no `package.json`: `npm run agents:init`.

---

## 🧪 Regra Mandatória: Verificação Antes de Concluir (Verify Before Done)

Nunca declare uma tarefa, correção ou feature concluída sem apresentar **evidência executada real**.

Toda entrega de código que envolva testes ou mudanças de comportamento DEVE conter:
1. **Comando ou MCP executado**: (ex: `npx playwright test <path>` ou `call_mcp_tool(playwright-test, test_run)`)
2. **Output bruto do terminal / MCP**: Demonstrando status `PASS`.
3. **Inspeção visual** (quando aplicável): Snapshot ou verificação de elementos na UI.

---

## 🏛️ Regras de Arquitetura & Integrações Obrigatórias

1. **Mensageria Desacoplada (`notify-server`)**:
   - NUNCA chamar Evolution API ou SMTP diretamente. Usar sempre o microserviço `notify-server`.
   - URL padrão nos containers Docker: `http://notify-web:8000`.
   - No host local: `http://localhost:8000`.

2. **Gateway de IA (`OmniRoute`)**:
   - Usar `http://10.0.1.35/v1` com `OpenAIAdapter` em `src/app/api/copilotkit/route.ts`.

3. **Modelo de Preços & Bolsa do Promotor**:
   - 4 Preços: PIX Padrão (`price_pix`), Cartão Padrão (`price_card_cents`), PIX Promo (`promo_price_pix`), Cartão Promo (`promo_price_card_cents`).
   - Bolsa Promotor Estudante (100% Grátis): `promoter_student_min_leads` (3 alunos para liberar) e `promoter_student_target_leads` (10 alunos para quitar).

4. **Hard-Lock do Setup**:
   - Se `bootstrapped: true`, a rota `/setup` é estritamente trancada e redireciona para `/login`. Ninguém acessa `/setup` após inicializado.
   - O Wizard possui persistência de rascunho em `sessionStorage` (`v7m.setup.draft.v1`).

Consulte [`docs/SETUP_AND_INTEGRATION_GUIDE.md`](./docs/SETUP_AND_INTEGRATION_GUIDE.md) para documentação completa.
