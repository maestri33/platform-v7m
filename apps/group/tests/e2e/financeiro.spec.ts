import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/finance-admin-sovereignty.plan.md
// seed: tests/e2e/seed.spec.ts

test.describe("Módulo Financeiro & Soberania do Admin", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.innerHTML = "cpk-web-inspector, copilot-popup { pointer-events: none !important; }";
      document.head.appendChild(style);
    });
  });

  test("1. Visão de Caixa & Previsibilidade (Cockpit Financeiro)", async ({ page }) => {
    await page.goto("/financeiro");

    // Valida carregamento do cabeçalho da página
    await expect(page.getByRole("heading", { name: /Gestão Financeira & Soberania Admin/i })).toBeVisible({ timeout: 15_000 });

    // Valida as abas disponíveis
    await expect(page.getByRole("button", { name: "Visão de Caixa & Previsibilidade" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ledger Contábil (360°)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Custos Imprevistos & Ajustes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Disputas & Chargebacks" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Fila de saída" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Comissões" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pagamento avulso" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Fechamento" })).toBeVisible();

    // Valida os cartões do cockpit de fluxo de caixa
    await expect(page.getByText("Obrigações Totais Imediatas")).toBeVisible();
    await expect(page.getByText("Receita Acumulada no Mês")).toBeVisible();
    await expect(page.getByText("Comissões em Aberto (Semana)")).toBeVisible();
    await expect(page.getByText("Fila de Saída em Processamento")).toBeVisible();
    await expect(page.getByText("Custos Imprevistos no Mês")).toBeVisible();
    await expect(page.getByText("Volume em Disputa / Risco")).toBeVisible();
  });

  test("2. Ledger Contábil (Partidas Dobradas e Lançamentos)", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page.getByRole("heading", { name: /Gestão Financeira & Soberania Admin/i })).toBeVisible({ timeout: 15_000 });

    // Alterna para o Ledger Contábil
    await page.getByRole("button", { name: "Ledger Contábil (360°)" }).click({ force: true });
    await expect(page.getByRole("heading", { name: /Ledger Contábil \(Partidas Dobradas\)/i })).toBeVisible();

    // Valida as colunas e os lançamentos contábeis
    await expect(page.getByRole("columnheader", { name: "Data / Hora" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Conta Contábil" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Tipo" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Valor" })).toBeVisible();
    await expect(page.getByText("Conta Caixa Asaas")).toBeVisible();
    await expect(page.getByText("Receita de Matrículas")).toBeVisible();
    await expect(page.getByText("DÉBITO", { exact: true })).toBeVisible();
    await expect(page.getByText("CRÉDITO", { exact: true })).toBeVisible();
  });

  test("3. Registro de Custo Imprevisto & Desembolso", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page.getByRole("heading", { name: /Gestão Financeira & Soberania Admin/i })).toBeVisible({ timeout: 15_000 });

    // Alterna para a aba Custos Imprevistos & Ajustes
    await page.getByRole("button", { name: "Custos Imprevistos & Ajustes" }).click({ force: true });
    await expect(page.getByRole("heading", { name: /Registrar e Pagar Custo Imprevisto/i })).toBeVisible();

    // Preenche formulário de custo emergencial
    await page.getByLabel("Valor (R$)").fill("350.00");
    await page.getByLabel("Descrição da Despesa").fill("Upgrade emergencial de cluster");
    await page.getByLabel("Justificativa da Decisão (Auditoria Obrigatória)").fill("Alta demanda no fechamento de matrículas");
    await page.getByLabel("Nome do Fornecedor / Favorecido").fill("Hetzner Cloud");
    await page.getByLabel("Chave PIX do Destinatário").fill("pix@hetzner.com");

    // Submete e valida modal de confirmação
    await page.getByRole("button", { name: "Confirmar e Enfileirar Pagamento" }).click({ force: true });
    await expect(page.getByRole("heading", { name: "Confirmar Liquidação de Custo Imprevisto" })).toBeVisible();

    // Confirma no modal
    await page.getByRole("button", { name: "Confirmar e Pagar" }).click({ force: true });

    // Valida mensagem de sucesso
    await expect(page.getByText(/Custo imprevisto registrado e desembolso enfileirado/i)).toBeVisible();
  });

  test("4. Ajuste Manual Contábil e Trilha de Auditoria", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page.getByRole("heading", { name: /Gestão Financeira & Soberania Admin/i })).toBeVisible({ timeout: 15_000 });

    // Alterna para a aba Custos Imprevistos & Ajustes
    await page.getByRole("button", { name: "Custos Imprevistos & Ajustes" }).click({ force: true });

    // Clica na sub-aba Ajuste Manual de Saldo
    await page.getByRole("button", { name: "Ajuste Manual de Saldo" }).click({ force: true });
    await expect(page.getByRole("heading", { name: "Ajuste Manual Contábil" })).toBeVisible();

    // Preenche ajuste manual
    await page.getByLabel("Valor do Ajuste (R$)").fill("500.00");
    await page.getByLabel("Justificativa Obrigatória").fill("Ajuste de conciliação bancária");

    // Grava o ajuste
    await page.getByRole("button", { name: "Gravar Ajuste no Ledger" }).click({ force: true });
    await expect(page.getByText(/Ajuste contábil lançado com sucesso/i)).toBeVisible();

    // Abre a sub-aba de Auditoria
    await page.getByRole("button", { name: "Trilha de Auditoria do Admin" }).click({ force: true });
    await expect(page.getByText("MANUAL_ADJUSTMENT")).toBeVisible();
    await expect(page.getByText("Ajuste de conciliação bancária")).toBeVisible();
  });

  test("5. Disputas, Chargebacks e Julgamento Soberano", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page.getByRole("heading", { name: /Gestão Financeira & Soberania Admin/i })).toBeVisible({ timeout: 15_000 });

    // Alterna para Disputas & Chargebacks
    await page.getByRole("button", { name: "Disputas & Chargebacks" }).click({ force: true });
    await expect(page.getByRole("heading", { name: "Disputas e Chargebacks" })).toBeVisible();

    // Valida disputa aberta listada
    await expect(page.getByText("OPEN")).toBeVisible();
    await expect(page.getByText("Contestação de Titularidade de Cartão")).toBeVisible();

    // Clica em Julgar Disputa
    await page.getByRole("button", { name: "Julgar Disputa" }).click({ force: true });
    await expect(page.getByText(/Veredito para Disputa/i)).toBeVisible();

    // Preenche justificativa e aplica veredito
    await page.getByLabel("Justificativa do Veredito").fill("Documentação analisada pelo suporte");
    await page.getByRole("button", { name: "Aplicar Decisão" }).click({ force: true });
  });

  test("6. Simulação e Adiantamento de Fechamento", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page.getByRole("heading", { name: /Gestão Financeira & Soberania Admin/i })).toBeVisible({ timeout: 15_000 });

    // Clica na aba Fechamento
    await page.getByRole("button", { name: "Fechamento" }).click({ force: true });
    await expect(page.getByRole("heading", { name: "Fechamento da semana" })).toBeVisible();

    // Simulação em Memória
    const simBtn = page.getByRole("button", { name: "Simular Fechamento em Memória" });
    await expect(simBtn).toBeVisible();
    await simBtn.click({ force: true });

    await expect(page.getByText(/Simulação da Semana/i)).toBeVisible();
    await expect(page.getByText("Comissões Pendentes")).toBeVisible();
    await expect(page.getByText("Bônus Conquistados")).toBeVisible();
  });
});
