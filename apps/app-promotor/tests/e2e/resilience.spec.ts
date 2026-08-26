import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

/**
 * Defeitos que atingiam o usuário em produção e não eram pegos pela suíte:
 *  1. conferência prévia da foto barrava o cadastro quando falhava;
 *  2. 409 WRONG_STATUS podia devolver a MESMA tela (laço) ou virar no-op;
 *  3. mídia do backend era bloqueada pela CSP (aula sem foto/vídeo).
 */

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";
const fixture = {
  name: "identity.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    readFileSync(resolve("tests/fixtures/identity.png.base64"), "utf8").trim(),
    "base64",
  ),
};

async function entrar(page: import("@playwright/test").Page, telefone: string) {
  await page.goto("/");
  await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();
  // Sessão criada: cair no painel é o sinal
  await expect(page).toHaveURL(/\/painel$/, { timeout: 20_000 });
}

test("conferência da foto fora do ar não impede o envio do documento", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  await request.post(`${mockBackend}/__reset`);
  await entrar(page, "11999990101");
  await page.goto("/documento");

  await expect(page).toHaveURL(/\/documento$/);
  await page.getByLabel("RG").check();

  // Classificador cai bem na hora do envio: antes isso abortava o upload.
  await request.post(`${mockBackend}/__fail-next-classify`);
  const documentInput = page.locator('input[type="file"][accept="image/*,application/pdf"]');
  await documentInput.setInputFiles(fixture);

  // A foto sobe assim mesmo — o backend continua sendo a autoridade.
  await expect(page.getByText(/VERSO do RG/i)).toBeVisible({ timeout: 15_000 });
});

test("veredito negativo avisa, mas deixa enviar assim mesmo", async ({ page, request }) => {
  test.setTimeout(60_000);
  await request.post(`${mockBackend}/__reset`);
  await entrar(page, "11999990102");
  await page.goto("/documento");

  await expect(page).toHaveURL(/\/documento$/);
  await page.getByLabel("RG").check();

  // "Não é documento" com confiança → segura e explica…
  await request.post(`${mockBackend}/__classify?document=0`);
  const documentInput = page.locator('input[type="file"][accept="image/*,application/pdf"]');
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/não parece ser um documento/i)).toBeVisible();

  // …mas nunca prende: a pessoa insiste e o envio acontece.
  await page.getByRole("button", { name: /Enviar assim mesmo/i }).click();
  await expect(page.getByText(/VERSO do RG/i)).toBeVisible({ timeout: 15_000 });
});

test("409 de etapa fora de ordem não devolve a mesma tela", async ({ page, request }) => {
  test.setTimeout(60_000);
  await request.post(`${mockBackend}/__reset`);
  await entrar(page, "11999990103");

  // Coloca o candidato na selfie com o funil preenchido.
  await request.post(`${mockBackend}/__stage?status=selfie&pix=1&education=1`);
  await page.goto("/selfie");
  await expect(page).toHaveURL(/\/selfie$/);

  // O backend responde que a etapa é outra bem no envio da selfie.
  await request.post(`${mockBackend}/__wrong-status-selfie?expected=pix`);
  await page.getByRole("button", { name: /Li e concordo/i }).click();
  await page.locator('input[type="file"][capture="user"]').setInputFiles(fixture);
  await page.getByRole("button", { name: /Tirar selfie e assinar/i }).click();

  // O que NÃO pode acontecer: continuar na selfie (laço) ou nada acontecer.
  await expect(page).not.toHaveURL(/\/selfie$/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/(pix|escolaridade|painel|documento|endereco)$/);
});

test("mídia da aula é servida pela própria origem (CSP)", async ({ page, request }) => {
  test.setTimeout(60_000);
  await request.post(`${mockBackend}/__reset`);
  await entrar(page, "11999990104");
  await request.post(`${mockBackend}/__approve`);

  await page.goto("/treinamento/material-e2e");
  const lessonImage = page.locator('img[alt*="Imagem da matéria"]');
  await expect(lessonImage).toBeVisible();

  // Nunca URL absoluta do backend: só o proxy de mesma origem passa na CSP.
  const src = await lessonImage.getAttribute("src");
  expect(src).toMatch(/^\/api\/me\/media\?src=/);

  // E o proxy entrega a imagem de verdade, autenticada.
  const proxied = await page.request.get(src!);
  expect(proxied.status()).toBe(200);
  expect(proxied.headers()["content-type"]).toContain("image/");
});

test("proxy de mídia recusa host fora do backend", async ({ page, request }) => {
  await request.post(`${mockBackend}/__reset`);
  await entrar(page, "11999990105");

  const evil = await page.request.get(
    `/api/me/media?src=${encodeURIComponent("http://169.254.169.254/latest/meta-data/")}`,
  );
  expect(evil.status()).toBe(403);
});
