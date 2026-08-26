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

async function uploadAddressProof(page: import("@playwright/test").Page) {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Enviar arquivo/i }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(fixture);
}

test("erros de documento e comprovante permitem corrigir sem recomeçar", async ({
  page,
  request,
}) => {
  await request.post(`${mockBackend}/__reset`);
  await page.goto("/");
  await page.getByLabel(/^CPF$/i).fill("52998224725");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/painel$/);

  await request.post(`${mockBackend}/__fail-next-classify`);
  const documentGate = page.getByRole("dialog", { name: /Envie seu RG ou CNH/i });
  await documentGate.getByLabel("RG").check();
  const documentInput = documentGate.locator('input[type="file"][accept="image/*,application/pdf"]');
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/Não conseguimos confirmar o documento agora/i)).toBeVisible();
  await expect(page.getByText(/Primeiro envie a FRENTE do RG/i)).toBeVisible();

  await request.post(`${mockBackend}/__classify?document=0`);
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/Essa imagem não parece ser um documento/i)).toBeVisible();
  await expect(page).toHaveURL(/\/painel$/);

  await request.post(`${mockBackend}/__classify?document=1&completeness=front&legible=0`);
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/imagem está desfocada/i)).toBeVisible();
  await expect(page).toHaveURL(/\/painel$/);

  await request.post(`${mockBackend}/__classify?document=1&completeness=front&legible=1`);
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/VERSO do RG/i)).toBeVisible();

  await request.post(`${mockBackend}/__classify?document=1&completeness=front&legible=0`);
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/parece ser a FRENTE do RG/i)).toBeVisible();
  await expect(page).toHaveURL(/\/painel$/);

  await request.post(`${mockBackend}/__classify?document=1&completeness=back&legible=1`);
  await documentInput.setInputFiles(fixture);
  await expect(page).toHaveURL(/\/painel$/);
  await page.getByRole("link", { name: /Comprovante/i }).click();
  await expect(page).toHaveURL(/\/endereco$/);

  await request.post(`${mockBackend}/__fail-next-proof`);
  await uploadAddressProof(page);
  await expect(page.getByText(/Falha temporária ao armazenar/i)).toBeVisible();
  await expect(page).toHaveURL(/\/endereco$/);

  await uploadAddressProof(page);
  await expect(page).toHaveURL(/\/painel$/);
});
