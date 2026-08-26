import { expect, test } from "@playwright/test";

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";

test("retoma cada estado na próxima etapa correta", async ({ page, request }) => {
  await request.post(`${mockBackend}/__reset`);
  await page.goto("/");
  await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/painel$/, { timeout: 15_000 });

  const cases = [
    { query: "status=profile", expected: /\/documento$/ },
    { query: "status=address", expected: /\/documento$/ },
    { query: "status=documents", expected: /\/documento$/ },
    { query: "status=pix", expected: /\/pix$/ },
    { query: "status=pix&pix=1", expected: /\/escolaridade$/ },
    { query: "status=education&pix=1&education=1", expected: /\/selfie$/ },
  ];

  for (const scenario of cases) {
    await request.post(`${mockBackend}/__stage?${scenario.query}`);
    await page.goto("/continuar");
    await expect(page).toHaveURL(scenario.expected);
  }
});
