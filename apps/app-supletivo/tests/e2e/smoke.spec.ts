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

  test("aluno existente percorre telefone e OTP e segue o funil", async ({ page }) => {
    const externalId = "11111111-1111-4111-8111-111111111111";
    let checkBody: unknown;
    let loginBody: unknown;

    await page.route("**/api/v1/clients/auth/check", async (route) => {
      checkBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          found: true,
          external_id: externalId,
          otp_sent: true,
          otp_wait: 0,
          whatsapp: true,
          roles: ["lead"],
        }),
      });
    });
    await page.route("**/api/v1/clients/auth/login", async (route) => {
      loginBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "e2e-access-token",
          refresh_token: "e2e-refresh-token",
          token_type: "bearer",
        }),
      });
    });
    await page.route("**/api/v1/clients/whoami", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external_id: externalId, roles: ["lead"], name: "Aluno Teste" }),
      }),
    );
    await page.route("**/api/v1/clients/lead/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: externalId,
          status: "pending",
          created_at: "2026-01-01T00:00:00Z",
          customer: { name: "Aluno Teste" },
          promoter: {},
          checkout: null,
        }),
      }),
    );

    // Funil v2: o campo é "Seu WhatsApp" e AUTO-avança no 11º dígito — não há "Continuar".
    await page.goto("/");
    const phoneInput = page.locator("#lead-phone");
    await phoneInput.click();
    await phoneInput.pressSequentially("11999999999", { delay: 25 });

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    expect(checkBody).toMatchObject({ phone: "11999999999" });
    await page.getByLabel("Dígito 1").fill("123456");

    // Lead logado segue o FUNIL (próximo passo = CPF); painel é a tela de RETORNO,
    // de quem já tem checkout gerado — não o pós-OTP de quem está no meio do caminho.
    await expect(page).toHaveURL(/\/cpf$/);
    await expect(page.getByRole("heading", { name: "Qual é o seu CPF?" })).toBeVisible();
    expect(loginBody).toEqual({ external_id: externalId, otp: "123456" });
  });

  test("perfil de equipe não entra pelo ambiente do aluno", async ({ page }) => {
    await page.route("**/api/v1/clients/auth/check", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          found: true,
          external_id: "22222222-2222-4222-8222-222222222222",
          otp_sent: true,
          otp_wait: 0,
          whatsapp: true,
          roles: ["promoter"],
        }),
      }),
    );

    // Funil v2: perfil de equipe cai no modal "Acesso em outro ambiente" e fica no /.
    await page.goto("/");
    const phoneInput = page.locator("#lead-phone");
    await phoneInput.click();
    await phoneInput.pressSequentially("11988888888", { delay: 25 });

    await expect(page.getByRole("dialog", { name: "Acesso em outro ambiente" })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});
