// spec: specs/hub-coordination.plan.md
// seed: tests/e2e/seed.spec.ts
import { test, expect } from "@playwright/test";
import { setupMockEnvironment } from "../helpers/mock";

test.describe("Autenticação e Controle de Acesso", () => {
  test("Perfil não-coordenador é bloqueado antes do envio de OTP", async ({ page }) => {
    await setupMockEnvironment(page, { coordinator: false });

    // 1. Acessar a página inicial /
    await page.goto("/");
    await expect(page.getByLabel("Telefone/WhatsApp")).toBeVisible();

    // 2. Preencher telefone de não-coordenador e clicar em 'Enviar código'
    await page.getByLabel("Telefone/WhatsApp").fill("(11) 94444-4444");
    await page.getByRole("button", { name: "Enviar código" }).click();

    // 3. Validar mensagem de bloqueio e ocultação do formulário de OTP
    await expect(page.getByText("Este acesso é exclusivo para coordenadores.")).toBeVisible();
    await expect(page.locator("#otp-form")).toBeHidden();
  });
});
