import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/full_audit.plan.md (Seção 3.11)
// seed: tests/e2e/seed.spec.ts

test.describe("6. Configurações da Plataforma e Integrações", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("6.1 Painel de Configurações e Navegação entre as 5 Abas", async ({ page }) => {
    await page.goto("/configuracoes");

    // Valida título da página
    await expect(page.getByRole("heading", { name: "Configurações da Plataforma" })).toBeVisible({ timeout: 15_000 });

    // Valida botões de abas
    await expect(page.getByRole("button", { name: "Boss & Bootstrap" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Preços do Curso" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Comissões & Metas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chaves & Conexões" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Saldos & Liquidez" })).toBeVisible();
  });

  test("6.2 Edição e Persistência dos Dados do Boss", async ({ page }) => {
    await page.goto("/configuracoes");

    // Preenche novos dados do Boss
    const nameInput = page.getByLabel("Nome Completo");
    await nameInput.fill("Administrador Geral Alterado");

    const pixInput = page.getByLabel(/Chave PIX/i);
    await pixInput.fill("boss.novo@v7m.com.br");

    // Clica em Salvar Dados do Boss
    const saveBtn = page.getByRole("button", { name: "Salvar Dados do Boss" });
    await saveBtn.click();

    // Valida feedback de sucesso
    await expect(page.getByText("Configurações salvas e aplicadas com sucesso!")).toBeVisible();
  });

  test("6.3 Configuração de Preços e Regras da Bolsa do Promotor Estudante", async ({ page }) => {
    await page.goto("/configuracoes");

    // Clica na aba Preços do Curso
    await page.getByRole("button", { name: "Preços do Curso" }).click();
    await expect(page.getByText("Bolsa Promotor Estudante")).toBeVisible();

    // Altera campos de preço e bolsa
    const pixPriceInput = page.getByLabel("Preço Padrão - PIX (R$)");
    await pixPriceInput.fill("99");

    const minLeadsInput = page.getByLabel("Alunos para Liberar Matrícula (Mínimo)");
    await minLeadsInput.fill("4");

    // Salva seção
    const savePricingBtn = page.getByRole("button", { name: "Salvar Preços & Regras da Bolsa" });
    await savePricingBtn.click();

    // Valida feedback de sucesso
    await expect(page.getByText("Configurações salvas e aplicadas com sucesso!")).toBeVisible();
  });

  test("6.4 Teste de Conexão de Integração ao Vivo", async ({ page }) => {
    await page.goto("/configuracoes");

    // Clica na aba Chaves & Conexões
    await page.getByRole("button", { name: "Chaves & Conexões" }).click();
    await expect(page.getByText("Chaves de API & Conexões Externas")).toBeVisible();

    // Clica em Testar Conexão no Asaas
    const testAsaasBtn = page.getByRole("button", { name: "Testar Conexão" }).first();
    await expect(testAsaasBtn).toBeVisible();
    await testAsaasBtn.click();

    // Valida feedback de status operacional
    await expect(page.getByText(/operacional|ms/i).first()).toBeVisible();
  });

  test("6.5 Execução de Bootstrap / Seed com Feedback", async ({ page }) => {
    await page.goto("/configuracoes");

    // Clica em Executar Bootstrap / Seeds
    const seedBtn = page.getByRole("button", { name: "Executar Bootstrap / Seeds" });
    await expect(seedBtn).toBeVisible();
    await seedBtn.click();

    // Valida abertura do ConfirmDialog
    await expect(page.getByRole("heading", { name: "Executar Bootstrap / Seeds?" })).toBeVisible();

    // Confirma execução
    const confirmActionBtn = page.getByRole("button", { name: "Sim, executar Bootstrap" });
    await confirmActionBtn.click();

    // Valida feedback e saída formatada
    await expect(page.getByText("Seed / Bootstrap executado com sucesso!")).toBeVisible();
    await expect(page.getByText("Resultado do Bootstrap:")).toBeVisible();
  });
});
