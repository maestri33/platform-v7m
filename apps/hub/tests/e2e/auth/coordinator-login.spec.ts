// spec: specs/hub-coordination.plan.md
// seed: tests/e2e/seed.spec.ts
import { test, expect } from "@playwright/test";
import { setupMockEnvironment } from "../helpers/mock";

test.describe("Autenticação e Controle de Acesso", () => {
  test("Coordenador realiza login via OTP com sucesso", async ({ page }) => {
    await setupMockEnvironment(page);

    // 1. Acessar a página inicial /
    await page.goto("/");
    await expect(page.getByLabel("Telefone/WhatsApp")).toBeVisible();

    // 2. Preencher telefone válido '(11) 95555-5555' e clicar em 'Enviar código'
    await page.getByLabel("Telefone/WhatsApp").fill("(11) 95555-5555");
    await page.getByRole("button", { name: "Enviar código" }).click();
    await expect(page.getByLabel("Código de 6 dígitos")).toBeVisible();

    // 3. Digitar código '123456' e clicar em 'Entrar no polo'
    await page.getByLabel("Código de 6 dígitos").fill("123456");
    await page.getByRole("button", { name: "Entrar no polo" }).click();

    // Verificações do painel do coordenador
    await expect(page.getByRole("heading", { name: "Visão geral do polo" })).toBeVisible();
    await expect(page.locator("#hub-brand")).toContainText("Polo Teste");
    await expect(page.locator("#stats")).toContainText("Revisões");
    await expect(page.locator("#reviews-preview")).toContainText("Revisão RG");
  });
});
