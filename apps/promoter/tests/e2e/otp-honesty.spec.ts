import { test, expect } from "@playwright/test";

// O backend devolve `otp_sent` honesto (false quando rate-limitado ou o dispatch
// falhou). O front NUNCA pode prometer "mandamos o código" nesse caso.
// Stub da rota — não toca no backend nem dispara WhatsApp real.
test.describe("app-v7m · OTP honesto", () => {
  const cpf = "52998224725";

  async function submitCpf(page: import("@playwright/test").Page) {
    await page.goto("/");
    await page.getByLabel(/^CPF$/i).fill(cpf);
    await page.getByRole("button", { name: /continuar/i }).click();
  }

  test("otp_sent:true → promete o código", async ({ page }) => {
    await page.route("**/api/auth/check", (route) =>
      route.fulfill({
        json: { found: true, external_id: "u-1", otp_sent: true, otp_wait: null },
      }),
    );
    await submitCpf(page);
    await expect(page.getByText(/Enviamos um código de 6 dígitos/i)).toBeVisible();
  });

  test("otp_sent:false → não promete o código", async ({ page }) => {
    await page.route("**/api/auth/check", (route) =>
      route.fulfill({
        json: { found: true, external_id: "u-1", otp_sent: false, otp_wait: 45 },
      }),
    );
    await submitCpf(page);
    await expect(page.getByText(/Não conseguimos enviar um código/i)).toBeVisible();
    await expect(page.getByText(/Enviamos um código de 6 dígitos/i)).toHaveCount(0);
  });

  test("OTP_NOT_SENT → fica no CPF, com o motivo", async ({ page }) => {
    await page.route("**/api/auth/check", (route) =>
      route.fulfill({
        status: 502,
        json: { detail: "falha no dispatch", code: "OTP_NOT_SENT" },
      }),
    );
    await submitCpf(page);
    await expect(page.getByText(/Confira se esse número tem WhatsApp ativo/i)).toBeVisible();
    // não avançou pra tela de código
    await expect(page.getByLabel(/Código de 6 dígitos/i)).toHaveCount(0);
  });

  test("NOT_IN_FUNNEL mostra saída acionável, sem jargão interno", async ({ page }) => {
    await page.route("**/api/auth/check", (route) =>
      route.fulfill({ json: { found: true, external_id: "u-1", otp_sent: true, otp_wait: 60 } }),
    );
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 403,
        json: { detail: "Usuário não faz parte do funil do colaborador.", code: "NOT_IN_FUNNEL" },
      }),
    );
    await submitCpf(page);
    await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page.getByText(/ainda não está no programa de promotores/i)).toBeVisible();
    await expect(page.getByText(/não faz parte do funil/i)).toHaveCount(0);
  });

  test("conta de outro funil confirma OTP e ativa acesso de promotor", async ({ page }) => {
    let loginCalls = 0;
    let joinBody: Record<string, unknown> | null = null;
    await page.route("**/api/auth/check", (route) =>
      route.fulfill({
        json: {
          found: true,
          external_id: "u-lead",
          otp_sent: true,
          otp_wait: 60,
          roles: ["lead"],
        },
      }),
    );
    await page.route("**/api/auth/login", (route) => {
      loginCalls += 1;
      return route.fulfill({ status: 500, json: { code: "WRONG_ENDPOINT" } });
    });
    await page.route("**/api/auth/join", async (route) => {
      joinBody = route.request().postDataJSON();
      return route.fulfill({ json: { ok: true } });
    });

    await submitCpf(page);
    await expect(page.getByText(/Confirme para criar seu acesso/i)).toBeVisible();
    await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
    await page.getByRole("button", { name: /Confirmar e criar acesso/i }).click();

    await expect.poll(() => joinBody).not.toBeNull();
    expect(joinBody).toMatchObject({ external_id: "u-lead", otp: "000000" });
    expect(loginCalls).toBe(0);
  });

  test("pré-checagem negativa de WhatsApp não impede cadastro", async ({ page }) => {
    await page.route("**/api/auth/check", (route) =>
      route.fulfill({ json: { found: false, otp_sent: false, whatsapp: false } }),
    );

    await submitCpf(page);

    await expect(page.getByRole("heading", { name: /Criar cadastro/i })).toBeVisible();
    await expect(page.getByText(/ainda pode criar o cadastro/i)).toBeVisible();
    await expect(page.getByText(/não tem WhatsApp/i)).toHaveCount(0);
  });

  test("cadastro criado sem envio libera reenvio imediato", async ({ page }) => {
    await page.route("**/api/auth/check", (route) =>
      route.fulfill({ json: { found: false, otp_sent: false, whatsapp: true } }),
    );
    await page.route("**/api/auth/register", (route) =>
      route.fulfill({
        status: 201,
        json: { user_external_id: "u-new", external_id: "c-new", otp_sent: false },
      }),
    );

    await submitCpf(page);
    await page.getByLabel(/Telefone \(WhatsApp\)/i).fill("11987654321");
    await page.getByLabel(/E-mail/i).fill("novo@v7m.test");
    await page.getByRole("button", { name: /Criar cadastro/i }).click();

    await expect(page.getByText(/Não conseguimos enviar um código agora/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Reenviar código" })).toBeEnabled();
  });

  test("links legais e ajuda usam a fonte oficial única", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Ajuda" })).toHaveAttribute(
      "href",
      "https://wa.me/5511920062177",
    );
    await expect(page.getByRole("link", { name: "Termos" })).toHaveAttribute(
      "href",
      "https://job.v7m.org/termos/",
    );
    await expect(page.getByRole("link", { name: "Privacidade" })).toHaveAttribute(
      "href",
      "https://job.v7m.org/privacidade/",
    );
  });
});
