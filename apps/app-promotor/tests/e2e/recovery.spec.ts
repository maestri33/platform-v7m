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

test("erros de documento e comprovante permitem corrigir sem recomeçar", async ({
  page,
  request,
}) => {
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

  // Veredito negativo e CONFIANTE segura a foto e explica…
  await request.post(`${mockBackend}/__classify?document=0`);
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/não parece ser um documento/i)).toBeVisible();
  await expect(page).toHaveURL(/\/documento$/);

  await request.post(`${mockBackend}/__classify?document=1&completeness=front&legible=0`);
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/pouco legível|imagem está desfocada/i)).toBeVisible();
  await expect(page).toHaveURL(/\/documento$/);

  await request.post(`${mockBackend}/__classify?document=1&completeness=front&legible=1`);
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/VERSO do RG/i)).toBeVisible();

  // Lado errado continua avisando na hora (é útil), sem deixar a pessoa presa.
  await request.post(`${mockBackend}/__classify?document=1&completeness=front&legible=0`);
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/parece ser a FRENTE do RG/i)).toBeVisible();
  await expect(page).toHaveURL(/\/documento$/);

  await request.post(`${mockBackend}/__classify?document=1&completeness=back&legible=1`);
  await documentInput.setInputFiles(fixture);
  await expect(page).toHaveURL(/\/endereco$/);

  await request.post(`${mockBackend}/__fail-next-proof`);
  const proofInput = page.locator('input[type="file"][accept="image/*,application/pdf"]');
  await proofInput.setInputFiles(fixture);
  await expect(page.getByText(/Falha temporária ao armazenar/i)).toBeVisible();
  await expect(page).toHaveURL(/\/endereco$/);

  await proofInput.setInputFiles(fixture);
  await expect(page).toHaveURL(/\/pix$/);
});
