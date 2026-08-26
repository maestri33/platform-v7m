import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";
const fixture = {
  name: "identity.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    readFileSync(resolve("tests/fixtures/identity.png.base64"), "utf8").trim(),
    "base64",
  ),
};

test("telefone → OTP → cadastro → treinamento → painel", async ({ page, request }) => {
  test.setTimeout(90_000);
  await request.post(`${mockBackend}/__reset`);

  await page.goto("/");
  await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/painel$/, { timeout: 15_000 });
  await page.goto("/documento");
  await expect(page).toHaveURL(/\/documento$/);
  await page.getByLabel("RG").check();
  const documentInput = page.locator('input[type="file"][accept="image/*,application/pdf"]');
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/VERSO do RG/i)).toBeVisible();
  await request.post(`${mockBackend}/__classify?document=1&completeness=back&legible=1`);
  await documentInput.setInputFiles(fixture);

  await expect(page).toHaveURL(/\/endereco$/, { timeout: 15_000 });
  await page.locator('input[type="file"][accept="image/*,application/pdf"]').setInputFiles(fixture);

  await expect(page).toHaveURL(/\/pix$/, { timeout: 15_000 });
  await page.getByLabel("Chave").fill("e2e-promotor@v7m.test");
  await page.getByRole("button", { name: /Validar chave/i }).click();

  await expect(page).toHaveURL(/\/escolaridade$/);
  await page.getByRole("button", { name: "Responder por opções" }).click();
  await page.getByRole("button", { name: "Ensino Médio" }).click();
  await page.getByRole("button", { name: "Sim, concluí essa etapa" }).click();
  await page.getByLabel("Em que ano isso aconteceu?").fill("2026");
  await page.getByRole("button", { name: /Confirmar e continuar/i }).click();

  await expect(page).toHaveURL(/\/selfie$/);
  await page.getByRole("button", { name: /Li e concordo/i }).click();
  await page.locator('input[type="file"][capture="user"]').setInputFiles(fixture);
  await page.getByRole("button", { name: /Tirar selfie e assinar/i }).click();

  await expect(page).toHaveURL(/\/treinamento$/);
  await page.getByRole("link", { name: /Abrir e responder/i }).click();
  await page.getByLabel("Sua resposta").fill(
    "Eu explicaria o curso com clareza, sem prometer aprovação ou emprego.",
  );
  await page.getByRole("button", { name: /Enviar resposta/i }).click();

  await expect(page).toHaveURL(/\/painel$/, { timeout: 15_000 });
  await expect(page.getByText(/Olá, Promotor E2E V7M/i)).toBeVisible();
  await expect(page.getByText(/Seu link/i).first()).toBeVisible();
});
