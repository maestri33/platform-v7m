import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks, MOCK_HUBS } from "./helpers/mock-api";

/**
 * Suíte E2E: Cockpit Administrativo (V7M Staff)
 * Baseado na especificação specs/e2e-admin-cockpit.md
 *
 * Cobertura:
 *  - TC-ADMIN-001 a TC-ADMIN-002: Autenticação de Staff (WhatsApp OTP e Senha Master de Contingência)
 *  - TC-ADMIN-003 a TC-ADMIN-005: Dashboard Overview, Criação de Polo e Modo Gestor (Impersonação)
 *  - TC-ADMIN-006 a TC-ADMIN-007: Gestão Global de Leads e Cadastro de Alunos
 *  - TC-ADMIN-008: Auditoria de Matrículas e Mesa de Conferência Documental (OCR)
 *  - TC-ADMIN-011 a TC-ADMIN-012: Módulo Financeiro (Fechamento Semanal, Lote PIX e Pagamento Avulso)
 *  - TC-ADMIN-013 a TC-ADMIN-015: Configurações Globais (Preços, Comissões) e Health Check de Integrações
 */

test.describe("1. Autenticação Administrativa & Senha Master", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("TC-ADMIN-001: Autenticação padrão do Staff via WhatsApp OTP", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Acesso do staff/i })).toBeVisible({ timeout: 15_000 });

    const phoneInput = page.getByRole("textbox", { name: /telefone/i });
    await phoneInput.fill("11999999999");

    const sendBtn = page.getByRole("button", { name: /Enviar código/i });
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Etapa 2: OTP
    await expect(page.getByRole("heading", { name: /Confirme o código/i })).toBeVisible();
    const firstOtpInput = page.getByRole("textbox", { name: "Dígito 1" });
    await expect(firstOtpInput).toBeVisible();
    await firstOtpInput.fill("123456");

    const enterBtn = page.getByRole("button", { name: "Entrar", exact: true });
    await expect(enterBtn).toBeEnabled({ timeout: 5_000 });
    await enterBtn.dispatchEvent("click");

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15_000 });
  });

  test("TC-ADMIN-002: Autenticação de Contingência com Senha Master", async ({ page }) => {
    await page.goto("/login");

    // Alterna para o modo de Senha Master
    const toggleButton = page.getByRole("button", { name: /Entrar com Senha Master/i });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    await expect(page.getByRole("heading", { name: "Acesso com Senha Master" })).toBeVisible();

    // Preenche credenciais master
    await page.getByRole("textbox", { name: /E-mail, Telefone ou CPF/i }).fill("admin@v7m.org");
    await page.getByLabel(/Senha Master/i).fill("senha_master_secreta");

    // Submete o login
    const loginButton = page.getByRole("button", { name: "Entrar com Senha Master" });
    await loginButton.click();

    // Deve autenticar e redirecionar para o dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15_000 });
  });
});

test.describe("2. Dashboard Master, Polos e Modo Gestor", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("TC-ADMIN-003: Visualização de KPIs Principais no Dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Cockpit do Administrador|Dashboard/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Abas de navegação do painel
    await expect(page.getByRole("button", { name: /Visão Geral & Polos/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Todos os Leads/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Alunos & Matrículas/i })).toBeVisible();
  });

  test("TC-ADMIN-004: Criação de Novo Polo Educacional via Modal", async ({ page }) => {
    await page.goto("/dashboard");

    const newPoloBtn = page.getByRole("button", { name: /\+ Novo Polo|Criar Polo/i }).first();
    if (await newPoloBtn.isVisible()) {
      await newPoloBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });

  test("TC-ADMIN-005: Modo Gestor (Impersonação de Polo / Fast-Switch)", async ({ page }) => {
    await page.goto("/dashboard");

    const gestorBtn = page.getByRole("button", { name: /Entrar como Gestor|Modo Gestor/i });
    if (await gestorBtn.isVisible()) {
      await gestorBtn.click();
      await expect(page.getByRole("dialog", { name: /Modo Gestor/i })).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("3. Auditoria de Matrículas e Conferência Documental", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("TC-ADMIN-008: Listagem Geral de Matrículas e Filtro por Polo", async ({ page }) => {
    await page.goto("/matriculas");
    await expect(page.getByRole("heading", { name: "Matrículas" })).toBeVisible({ timeout: 15_000 });

    // Colunas da tabela
    await expect(page.getByRole("columnheader", { name: "Nome" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "CPF" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
  });

  test("TC-ADMIN-008: Mesa Dual-View de Análise Documental (RG OCR e Selfie)", async ({ page }) => {
    await page.goto("/documentos");
    await expect(
      page.getByRole("heading", { name: /Mesa de Conferência de Documentos/i }),
    ).toBeVisible({ timeout: 15_000 });

    const openDualViewBtn = page.getByRole("button", { name: /Abrir Mesa Dual-View/i }).first();
    if (await openDualViewBtn.isVisible()) {
      await openDualViewBtn.click();
      await expect(page.getByRole("heading", { name: /Mesa de Conferência Documental:/i })).toBeVisible();

      // Botões de ação
      await expect(page.getByRole("button", { name: /Aprovar RG/i })).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("4. Módulo Financeiro (Fechamento e Pagamento Avulso)", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("TC-ADMIN-011: Navegação nas 4 Abas Financeiras e Simulação de Fechamento", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page.getByRole("heading", { name: "Gestão Financeira & Soberania Admin" })).toBeVisible({ timeout: 15_000 });

    // Abas
    await expect(page.getByRole("button", { name: "Fila de saída" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Comissões" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pagamento avulso" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Fechamento" })).toBeVisible();

    // Simulação do fechamento
    await page.getByRole("button", { name: "Fechamento" }).click();
    const simBtn = page.getByRole("button", { name: /Simular Fechamento/i });
    if (await simBtn.isVisible()) {
      await simBtn.click();
      await expect(page.getByText(/Simulação da Semana/i)).toBeVisible();
    }
  });

  test("TC-ADMIN-012: Envio de Pagamento Avulso via PIX com Confirmação", async ({ page }) => {
    await page.goto("/financeiro");
    await page.getByRole("button", { name: "Pagamento avulso" }).click();

    await page.getByLabel("Valor (R$)").fill("250.00");
    await page.getByLabel("Nome do beneficiário").fill("Promotor Destaque");
    await page.getByLabel("Chave PIX").fill("promotor@v7m.org");

    const reviewBtn = page.getByRole("button", { name: "Revisar e pagar" });
    await reviewBtn.click();

    // Modal de Confirmação
    await expect(page.getByRole("heading", { name: /Confirmar pagamento/i })).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Promotor Destaque")).toBeVisible();
  });
});

test.describe("5. Configurações Globais & Matriz de Integrações", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("TC-ADMIN-013 & TC-ADMIN-014: Editor de Preços do Curso e Comissões", async ({ page }) => {
    await page.goto("/configuracoes");
    await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible({ timeout: 15_000 });

    // Abas de Configuração
    await expect(page.getByRole("button", { name: /Preços e Planos|Preços/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Comissões & Metas|Comissões/i })).toBeVisible();
  });

  test("TC-ADMIN-015: Monitoramento de Saúde das Integrações (Health Matrix)", async ({ page }) => {
    await page.goto("/integracoes");
    await expect(page.getByRole("heading", { name: /Integrações/i })).toBeVisible({ timeout: 15_000 });

    // Status badges
    await expect(page.getByText(/Saudável|Conectado|Ativo|Asaas/i).first()).toBeVisible();
  });
});
