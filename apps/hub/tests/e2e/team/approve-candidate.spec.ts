// spec: specs/hub-coordination.plan.md
// seed: tests/e2e/seed.spec.ts
import { test, expect } from "@playwright/test";
import { setupMockEnvironment } from "../helpers/mock";

test.describe("Gestão de Equipe e Candidatos", () => {
  test("Coordenador aprova candidato pendente na equipe", async ({ page }) => {
    await setupMockEnvironment(page);

    let actionBody = "not-called";
    await page.route("**/api/v1/leadership/candidates/candidate-1/approve", async (route) => {
      actionBody = route.request().postData() || "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external_id: "candidate-1", status: "approved" }),
      });
    });
    page.on("dialog", (dialog) => dialog.accept());

    // 1. Login com coordenador
    await page.goto("/");
    await page.getByLabel("Telefone/WhatsApp").fill("(11) 95555-5555");
    await page.getByRole("button", { name: "Enviar código" }).click();
    await page.getByLabel("Código de 6 dígitos").fill("123456");
    await page.getByRole("button", { name: "Entrar no polo" }).click();
    await expect(page.getByRole("heading", { name: "Visão geral do polo" })).toBeVisible();

    // 2. Navegar para Equipe
    await page.locator("#nav-equipe").click();
    await expect(page.getByRole("heading", { name: "Equipe do Polo" })).toBeVisible();

    // 3. Clicar em aprovar candidato
    await page.getByRole("button", { name: "Aprovar" }).first().click();

    // Verificações
    await expect(page.getByRole("status")).toContainText("Operação concluída");
    expect(actionBody).toBe("");
  });
});
