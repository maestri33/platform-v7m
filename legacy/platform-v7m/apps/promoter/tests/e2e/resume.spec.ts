import { expect, test } from "@playwright/test";

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";

test("retoma cada estado no painel sem forçar um wizard", async ({ page, request }) => {
  await request.post(`${mockBackend}/__reset`);
  await page.goto("/");
  await page.getByLabel(/^CPF$/i).fill("52998224725");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/painel$/);

  const cases = [
    "status=profile",
    "status=address",
    "status=documents",
    "status=pix",
    "status=pix&pix=1",
    "status=education&pix=1&education=1",
  ];

  for (const query of cases) {
    await request.post(`${mockBackend}/__stage?${query}`);
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/painel$/);
  }
});
