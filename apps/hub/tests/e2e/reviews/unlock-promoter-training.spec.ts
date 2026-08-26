// spec: specs/hub-coordination.plan.md
// seed: tests/e2e/seed.spec.ts
import { test, expect } from "@playwright/test";
import { setupMockEnvironment } from "../helpers/mock";

test.describe("Central de Análises e Revisões", () => {
  test("Coordenador destrava matéria de treino de promotor na Central de Revisões", async ({ page }) => {
    await setupMockEnvironment(page);

    let unlocked = false;
    await page.route("**/api/v1/leadership/promoters/promoter-locked/materials/mat-1/approve", async (route) => {
      unlocked = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ promoter_external_id: "promoter-locked", material_external_id: "mat-1", locked: false }),
      });
    });

    // 1. Login com credencial de coordenador
    await page.goto("/");
    await page.getByLabel("Telefone/WhatsApp").fill("(11) 95555-5555");
    await page.getByRole("button", { name: "Enviar código" }).click();
    await page.getByLabel("Código de 6 dígitos").fill("123456");
    await page.getByRole("button", { name: "Entrar no polo" }).click();
    await expect(page.getByRole("heading", { name: "Visão geral do polo" })).toBeVisible();

    // 2. Navegar para Central de Revisões
    await page.locator("#nav-inbox").click();
    await expect(page.getByRole("heading", { name: "Central de Análises & Revisões" })).toBeVisible();

    // 3. Destravar treino e confirmar
    await page.getByRole("button", { name: "Destravar Treino" }).first().click();
    await page.getByRole("button", { name: "Confirmar" }).click();

    // Verificação de sucesso
    await expect(page.getByText("Matéria de treino aprovada e promotor destravado!")).toBeVisible();
    expect(unlocked).toBe(true);
  });
});
