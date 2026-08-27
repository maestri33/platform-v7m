import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

test.describe("Módulo Financeiro Real & Soberania do Admin", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("1. Acessa o Cockpit Financeiro e valida KPIs em tempo real", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page.getByRole("heading", { name: /Gestão Financeira & Soberania Admin/i })).toBeVisible({ timeout: 15_000 });

    // Valida os cards do cockpit
    await expect(page.getByText("Obrigações Totais Imediatas")).toBeVisible();
    await expect(page.getByText("Receita Acumulada no Mês")).toBeVisible();
    await expect(page.getByText("Comissões em Aberto (Semana)")).toBeVisible();
    await expect(page.getByText("Fila de Saída em Processamento")).toBeVisible();
    await expect(page.getByText("Custos Imprevistos no Mês")).toBeVisible();
    await expect(page.getByText("Volume em Disputa / Risco")).toBeVisible();
  });

  test("2. Navega para o Ledger Contábil e valida integridade de partidas dobradas", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page.getByRole("heading", { name: /Gestão Financeira & Soberania Admin/i })).toBeVisible({ timeout: 15_000 });

    // Alterna para o Ledger Contábil
    await page.getByRole("button", { name: "Ledger Contábil (360°)" }).click();
    await expect(page.getByRole("heading", { name: /Ledger Contábil \(Partidas Dobradas\)/i })).toBeVisible();

    // Valida as colunas do extrato contábil
    await expect(page.getByRole("columnheader", { name: "Data / Hora" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Conta Contábil" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Tipo" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Valor" })).toBeVisible();
  });

  test("3. Registra um Custo Imprevisto emergencial e valida liquidação", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page.getByRole("heading", { name: /Gestão Financeira & Soberania Admin/i })).toBeVisible({ timeout: 15_000 });

    // Alterna para Custos Imprevistos & Ajustes
    await page.getByRole("button", { name: "Custos Imprevistos & Ajustes" }).click();
    await expect(page.getByRole("heading", { name: /Registrar e Pagar Custo Imprevisto/i })).toBeVisible();

    // Preenche os campos obrigatórios
    await page.getByLabel("Valor (R$)").fill("120.00");
    await page.getByLabel("Descrição da Despesa").fill("Manutenção emergencial no CDN");
    await page.getByLabel("Justificativa da Decisão (Auditoria Obrigatória)").fill("Ajuste de cache durante pico de tráfego");
    await page.getByLabel("Nome do Fornecedor / Favorecido").fill("Cloudflare");
    await page.getByLabel("Chave PIX do Destinatário").fill("financeiro@cloudflare.com");

    // Submete e abre modal de confirmação
    await page.getByRole("button", { name: "Confirmar e Enfileirar Pagamento" }).click();
    await expect(page.getByRole("heading", { name: "Confirmar Liquidação de Custo Imprevisto" })).toBeVisible();

    // Confirma no modal de segurança
    await page.getByRole("button", { name: "Confirmar e Pagar" }).click();

    // Valida feedback de sucesso
    await expect(page.getByText(/Custo imprevisto registrado e desembolso enfileirado/i)).toBeVisible({ timeout: 10_000 });
  });

  test("4. Lança um Ajuste Manual Contábil e audita a intervenção", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page.getByRole("heading", { name: /Gestão Financeira & Soberania Admin/i })).toBeVisible({ timeout: 15_000 });

    // Alterna para Custos Imprevistos & Ajustes
    await page.getByRole("button", { name: "Custos Imprevistos & Ajustes" }).click();

    // Clica na sub-aba de Ajuste Manual
    await page.getByRole("button", { name: "Ajuste Manual de Saldo" }).click();
    await expect(page.getByRole("heading", { name: "Ajuste Manual Contábil" })).toBeVisible();

    // Preenche o ajuste
    await page.getByLabel("Valor do Ajuste (R$)").fill("300.00");
    await page.getByLabel("Justificativa Obrigatória").fill("Ajuste de conciliação bancária");

    // Grava o ajuste
    await page.getByRole("button", { name: "Gravar Ajuste no Ledger" }).click();
    await expect(page.getByText(/Ajuste contábil lançado com sucesso/i)).toBeVisible({ timeout: 10_000 });

    // Valida na Trilha de Auditoria
    await page.getByRole("button", { name: "Trilha de Auditoria do Admin" }).click();
    await expect(page.getByText("MANUAL_ADJUSTMENT")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Ajuste de conciliação bancária")).toBeVisible();
  });

  test("5. Visualiza Disputas & Chargebacks", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page.getByRole("heading", { name: /Gestão Financeira & Soberania Admin/i })).toBeVisible({ timeout: 15_000 });

    // Alterna para Disputas & Chargebacks
    await page.getByRole("button", { name: "Disputas & Chargebacks" }).click();
    await expect(page.getByRole("heading", { name: "Disputas e Chargebacks" })).toBeVisible();
  });
});
