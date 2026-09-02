import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/full_audit.plan.md (Seção 3.9)
// seed: tests/e2e/seed.spec.ts

test.describe("12. Treinamento e Onboarding de Promotores", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("12.1 Renderização de Materiais de Treinamento e Abas", async ({ page }) => {
    await page.goto("/treino");

    // Valida Header
    await expect(page.getByRole("heading", { name: "Treino LMS" })).toBeVisible({ timeout: 15_000 });

    // Valida abas
    await expect(page.getByRole("button", { name: "Matérias & Autoria" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Submissões & Áudios/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Desbloqueio de Promotores" })).toBeVisible();

    // Valida matéria cadastrada
    await expect(page.getByText("Treinamento Inicial de Vendas V7M")).toBeVisible();
  });

  test("12.2 Criação de Nova Matéria de Treinamento", async ({ page }) => {
    await page.goto("/treino");

    // Preenche os campos do formulário de criação
    await page.getByLabel("Título").fill("Como Fechar Vendas Rápidas");
    await page.locator("textarea").first().fill("Texto instrutivo sobre gatilhos mentais.");
    await page.locator("textarea").nth(1).fill("Qual a técnica de fechamento mais eficaz?");
    await page.getByLabel("Gabarito (resposta esperada)").fill("Técnica da escassez e ancoragem.");

    // Submete a criação
    const createBtn = page.getByRole("button", { name: "Criar matéria" });
    await createBtn.click();

    // Valida feedback
    await expect(page.getByText("Matéria criada.")).toBeVisible();
  });

  test("12.3 Auditoria de Áudio de Promotor com Avaliação de Nota", async ({ page }) => {
    await page.goto("/treino");

    // Clica na aba Submissões & Áudios
    const subTab = page.getByRole("button", { name: /Submissões & Áudios/ });
    await subTab.click();

    // Valida submissão carregada
    await expect(page.getByText("Lucas Rocha")).toBeVisible();
    await expect(page.getByText("Áudio Gravado pelo Promotor:")).toBeVisible();

    // Clica em Aprovar Resposta
    const approveBtn = page.getByRole("button", { name: "Aprovar Resposta" });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Valida abertura do modal de confirmação com campo de nota
    await expect(page.getByRole("heading", { name: "Aprovar Resposta do Promotor" })).toBeVisible();
    await expect(page.getByLabel("Nota (0.0 a 10.0)")).toHaveValue("10.0");

    // Confirma aprovação
    await page.getByRole("button", { name: "Confirmar Aprovação" }).click();

    // Modal fecha
    await expect(page.getByRole("heading", { name: "Aprovar Resposta do Promotor" })).not.toBeVisible();
  });

  test("12.4 Desbloqueio Administrativo Imediato de Promotores", async ({ page }) => {
    await page.goto("/treino");

    // Clica na aba Desbloqueio
    await page.getByRole("button", { name: "Desbloqueio de Promotores" }).click();
    await expect(page.getByText("Desbloqueio Administrativo de Treinamento")).toBeVisible();

    // Preenche ID do promotor
    const idInput = page.getByPlaceholder(/Cole o external_id/i);
    await idInput.fill("usr-prom-1");

    // Clica no botão de liberação
    const unlockBtn = page.getByRole("button", { name: "Liberar Promotor Imediatamente" });
    await unlockBtn.click();

    // Valida feedback de desbloqueio
    await expect(page.getByText("Promotor liberado imediatamente de todas as travas.")).toBeVisible();
  });
});
