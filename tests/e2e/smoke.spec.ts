import { test, expect } from "@playwright/test";

// Smoke mínimo e estável: não depende do backend Django nem de fluxos de UI
// instáveis. Valida que o Next sobe, a rota /healthz responde e o title/meta
// do app está no ar. Adicione specs por feature conforme os fluxos ganham forma.

test.describe("app-supletivo · smoke", () => {
  test("/healthz responde ok e expõe proveniência do build", async ({ request }) => {
    const res = await request.get("/healthz");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
    // sha/builtAt podem vir "unknown" em dev local — só checamos presença.
    expect(body).toHaveProperty("sha");
    expect(body).toHaveProperty("builtAt");
  });

  test("home carrega com o title da marca", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Supletivo Brasil/i);
  });
});