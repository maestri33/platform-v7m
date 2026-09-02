import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/full_audit.plan.md (Seção 3.12)
// seed: tests/e2e/seed.spec.ts

test.describe("13. Gestão Global de Usuários e Resgate de Acesso (/usuarios)", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("13.1 Filtragem de Usuários por Papel", async ({ page }) => {
    await page.goto("/usuarios");

    // Valida Header e Subtítulo
    await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Visão global dos usuários da plataforma e resgate de acesso.")).toBeVisible();

    // Valida botões de filtro de papéis
    await expect(page.getByRole("button", { name: "Todos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Leads" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Alunos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Promotores" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Coordenadores" })).toBeVisible();

    // Filtra por Coordenadores
    await page.getByRole("button", { name: "Coordenadores" }).click();
    await expect(page.getByText("Mariana Souza")).toBeVisible();

    // Filtra por Promotores
    await page.getByRole("button", { name: "Promotores" }).click();
    await expect(page.getByText("Lucas Rocha")).toBeVisible();
  });

  test("13.2 Resgate de Telefone de Usuário (Canal de OTP)", async ({ page }) => {
    await page.goto("/usuarios");
    await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();

    // Clica no botão Telefone do primeiro usuário
    const phoneBtn = page.getByRole("button", { name: "Telefone" }).first();
    await expect(phoneBtn).toBeVisible();
    await phoneBtn.click();

    // Valida abertura do PhoneDialog
    await expect(page.getByRole("dialog", { name: "Trocar telefone" })).toBeVisible();
    await expect(page.getByText(/Resgate de login: troca o número que recebe o OTP/i)).toBeVisible();

    // Preenche novo telefone com DDD válido
    const phoneInput = page.getByLabel("Novo WhatsApp (com DDD)");
    await phoneInput.fill("(11) 98888-7777");

    // Submete a troca
    const saveBtn = page.getByRole("button", { name: "Salvar telefone" });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Modal fecha
    await expect(page.getByRole("dialog", { name: "Trocar telefone" })).not.toBeVisible();
  });

  test("13.3 Edição de Credenciais EAD de Aluno Concluído", async ({ page }) => {
    await page.goto("/usuarios");
    await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();

    // Filtra por Alunos
    await page.getByRole("button", { name: "Alunos" }).click();
    await expect(page.getByText("Carlos Eduardo Silva")).toBeVisible();

    // Clica em Credenciais
    const credsBtn = page.getByRole("button", { name: "Credenciais" }).first();
    await expect(credsBtn).toBeVisible();
    await credsBtn.click();

    // Valida abertura do CredsDialog
    await expect(page.getByRole("dialog", { name: "Credenciais da plataforma" })).toBeVisible();
    await expect(page.getByText(/Login\/senha da plataforma de estudos/i)).toBeVisible();

    // Preenche login e senha
    await page.getByLabel("Login").fill("carlos.silva@ead.com.br");
    await page.getByLabel("Senha").fill("SenhaSegura123");

    // Salva credenciais
    const saveCredsBtn = page.getByRole("button", { name: "Salvar credenciais" });
    await expect(saveCredsBtn).toBeEnabled();
    await saveCredsBtn.click();

    // Valida feedback de sucesso
    await expect(page.getByText("Credenciais salvas.")).toBeVisible();
  });
});
