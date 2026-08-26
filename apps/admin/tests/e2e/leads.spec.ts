import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/full_audit.plan.md (Seção 3.4)
// seed: tests/e2e/seed.spec.ts

test.describe("8. Gestão de Leads e Funil de Captação", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("8.1 Listagem, KPIs de Leads e Filtro por Status", async ({ page }) => {
    await page.goto("/leads");

    // Valida Header e KPIs
    await expect(page.getByRole("heading", { name: "Leads de Captação" })).toBeVisible();
    await expect(page.getByText("Total de Leads Captados")).toBeVisible();
    await expect(page.getByText("Leads Convertidos (Pagos)")).toBeVisible();
    await expect(page.getByText("Taxa de Conversão Global")).toBeVisible();

    // Valida Card de Lead na lista
    await expect(page.getByText("Fernanda Costa")).toBeVisible();
    await expect(page.getByText("Gabriel Santos")).toBeVisible();

    // Filtra por 'Somente Pagos'
    const statusSelect = page.getByLabel("Filtrar por status");
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption("paid");

    await expect(page.getByText("Gabriel Santos")).toBeVisible();
    await expect(page.getByText("Fernanda Costa")).not.toBeVisible();

    // Filtra por 'Aguardando / Em Aberto'
    await statusSelect.selectOption("pending");
    await expect(page.getByText("Fernanda Costa")).toBeVisible();
    await expect(page.getByText("Gabriel Santos")).not.toBeVisible();
  });

  test("8.2 Busca Textual de Leads", async ({ page }) => {
    await page.goto("/leads");

    const searchInput = page.getByPlaceholder("Buscar por nome, telefone, CPF ou ID...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Fernanda");

    await expect(page.getByText("Fernanda Costa")).toBeVisible();
    await expect(page.getByText("Gabriel Santos")).not.toBeVisible();

    // Busca inexistente
    await searchInput.fill("Inexistente 999");
    await expect(page.getByText(/Nenhum lead encontrado/)).toBeVisible();
  });

  test("8.3 Ação Rápida de WhatsApp", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.getByRole("heading", { name: "Leads de Captação" })).toBeVisible();

    // Localiza o botão WhatsApp do lead
    const waLink = page.getByRole("link", { name: "WhatsApp" }).first();
    await expect(waLink).toBeVisible();

    // Valida atributos do link de WhatsApp
    await expect(waLink).toHaveAttribute("target", "_blank");
    await expect(waLink).toHaveAttribute("href", /https:\/\/wa\.me\/55/);
  });

  test("8.4 Confirmação Manual de Pagamento com Modal de Segurança", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.getByRole("heading", { name: "Leads de Captação" })).toBeVisible();

    // Filtra por pendentes para garantir que o botão Confirmar Pago esteja visível
    const statusSelect = page.getByLabel("Filtrar por status");
    await statusSelect.selectOption("pending");

    const confirmPayBtn = page.getByRole("button", { name: "Confirmar Pago" }).first();
    await expect(confirmPayBtn).toBeVisible();
    await confirmPayBtn.click();

    // Valida abertura do ConfirmDialog
    await expect(page.getByRole("heading", { name: "Confirmar pagamento manual de lead" })).toBeVisible();
    await expect(page.getByText(/promove o lead imediatamente para aluno\/matrícula ativa/i)).toBeVisible();

    // Confirma o pagamento
    const confirmActionBtn = page.getByRole("button", { name: "Confirmar pagamento e matricular" });
    await expect(confirmActionBtn).toBeVisible();
    await confirmActionBtn.click();

    // Valida feedback de sucesso
    await expect(page.getByText(/confirmado com sucesso! Promovido a matrícula/i)).toBeVisible();
  });
});
