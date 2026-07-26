import { test, expect, type Page } from "@playwright/test";

/**
 * Tela 6 do funil do lead — checkout (`POST /lead/checkout` + acompanhamento por
 * `GET /lead/me`).
 *
 * O contrato central: a timeline é TEATRO e a API é quem manda — ela interrompe
 * quando a resposta chega, e o destino final é o REDIRECT pro gateway
 * (`window.location`). Erro de criação NUNCA vira modal: é a tela elegante com
 * Tentar novamente / outra forma / suporte (DOCUMENTACAO §229). A chegada por
 * /planos → confirmar já é coberta pelo spec da tela 5; aqui o /checkout carrega
 * direto (entrada fria recria a sessão — contrato "criável e TROCÁVEL").
 */

const CHECKOUT = "**/api/v1/clients/lead/checkout";
const ME = "**/api/v1/clients/lead/me";
const GATEWAY = "https://pagamento.parceiro.com.br/**";
const URL_GATEWAY = "https://pagamento.parceiro.com.br/c/E2E123";

const CO_OK = {
  payment_method: "pix",
  provider: "asaas",
  amount: "999.00",
  is_paid: false,
  url: URL_GATEWAY,
};

type Reply = { status: number; body: unknown };

/** Intercepta a criação. Como nas outras telas, a última resposta da fila se repete. */
async function stubCheckout(page: Page, ...respostas: Reply[]) {
  const sent: Array<{ payment_method?: string }> = [];
  const fila: Reply[] = respostas.length ? respostas : [{ status: 200, body: CO_OK }];
  await page.route(CHECKOUT, async (route) => {
    const r = fila[Math.min(sent.length, fila.length - 1)];
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status: r.status,
      contentType: "application/json",
      body: JSON.stringify(r.body),
    });
  });
  return sent;
}

/** O "gateway": qualquer navegação pra lá vira uma página estática — prova o redirect. */
async function stubGateway(page: Page) {
  await page.route(GATEWAY, (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>gateway de pagamento</h1>" }),
  );
}

async function chegarNoCheckout(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "supletivo.session",
      JSON.stringify({ phone: "11912345678", externalId: "3f8b1c2e-0a4d-4f11-9e77-2b6d5c8a1e90" }),
    );
    window.localStorage.setItem(
      "supletivo.login",
      JSON.stringify({ access_token: "a", refresh_token: "r", token_type: "bearer" }),
    );
  });
  await page.goto("/checkout");
}

// Rede de segurança das telas anteriores: nada escapa pro proxy /api do dev server.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
});

test.describe("funil do lead · tela 6 (checkout)", () => {
  test("timeline roda, interrompe quando a URL chega e REDIRECIONA pro gateway", async ({ page }) => {
    const sent = await stubCheckout(page);
    await stubGateway(page);
    await chegarNoCheckout(page);

    // O teatro da timeline: o chip do método e a construção da matrícula.
    await expect(page.getByText(/PIX à vista/)).toBeVisible();
    await expect(page.getByText("Identidade confirmada")).toBeVisible();

    // A API respondeu com a URL → "Tudo pronto!" + o link à mostra.
    await expect(page.getByRole("heading", { name: "Tudo pronto!" })).toBeVisible();
    await expect(page.getByText(URL_GATEWAY)).toBeVisible();
    expect(sent).toEqual([{ payment_method: "pix" }]);

    // O destino é o gateway — mesma aba, window.location (spec §228).
    await page.waitForURL(/pagamento\.parceiro\.com\.br/, { timeout: 10_000 });
    await expect(page.getByText("gateway de pagamento")).toBeVisible();
  });

  test("URL nasce async: a criação volta sem ela e o front acompanha pelo /lead/me", async ({ page }) => {
    await stubCheckout(page, { status: 200, body: { ...CO_OK, url: null, checkout_url: null } });
    await stubGateway(page);
    // 1ª consulta ainda sem URL; a 2ª traz — o poll precisa seguir vivo até ela vir.
    let consultas = 0;
    await page.route(ME, (route) => {
      consultas += 1;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "l1",
          status: "pending",
          created_at: "2026-07-26T00:00:00Z",
          customer: {},
          promoter: { external_id: "p1" },
          checkout: consultas < 2 ? { ...CO_OK, url: null } : CO_OK,
        }),
      });
    });
    await chegarNoCheckout(page);

    await expect(page.getByRole("heading", { name: "Tudo pronto!" })).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForURL(/pagamento\.parceiro\.com\.br/, { timeout: 10_000 });
    expect(consultas).toBeGreaterThanOrEqual(2);
  });

  test("erro na criação: tela elegante SEM modal, e Tentar novamente re-cria", async ({ page }) => {
    const sent = await stubCheckout(page, { status: 500, body: { detail: "boom" } }, { status: 200, body: CO_OK });
    await stubGateway(page);
    await chegarNoCheckout(page);

    await expect(
      page.getByRole("heading", { name: "Não foi possível preparar seu pagamento." }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0); // §229: sem modal
    await expect(page.getByRole("button", { name: "Escolher outra forma de pagamento" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Falar com o suporte" })).toBeVisible();

    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByRole("heading", { name: "Tudo pronto!" })).toBeVisible();
    expect(sent).toHaveLength(2);
  });

  test("'Escolher outra forma de pagamento' devolve aos planos", async ({ page }) => {
    await stubCheckout(page, { status: 500, body: { detail: "boom" } });
    await page.route("**/api/v1/clients/pricing", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ pix: "999.00", card: { installments: 12, installment: "99.00", total: "1188.00" } }),
      }),
    );
    await chegarNoCheckout(page);

    await page.getByRole("button", { name: "Escolher outra forma de pagamento" }).click();
    await expect(page).toHaveURL(/\/planos$/);
    await expect(page.getByRole("heading", { name: "Como você prefere pagar?" })).toBeVisible();
  });

  test("ALREADY_PAID não cria outro checkout: o lugar de quem pagou é o painel", async ({ page }) => {
    await stubCheckout(page, { status: 409, body: { detail: "pago", code: "ALREADY_PAID" } });
    await chegarNoCheckout(page);

    await expect(page).toHaveURL(/\/painel$/);
  });

  test("PROFILE_INCOMPLETE devolve pro primeiro passo que falta", async ({ page }) => {
    await stubCheckout(page, {
      status: 409,
      body: { detail: "faltam campos", code: "PROFILE_INCOMPLETE", missing_fields: ["cpf", "email"] },
    });
    await chegarNoCheckout(page);

    await expect(page).toHaveURL(/\/cpf$/);
    await expect(page.getByRole("heading", { name: "Qual é o seu CPF?" })).toBeVisible();
  });

  test("sessão morta na criação → modal de sessão expirada, recomeça do passo 1", async ({ page }) => {
    // O core dá UMA chance de refresh antes de desistir — os dois morrem em 401.
    await page.route("**/api/v1/clients/auth/refresh", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "morto" }) }),
    );
    await stubCheckout(page, { status: 401, body: { detail: "expirado" } });
    await chegarNoCheckout(page);

    await expect(page.getByRole("dialog", { name: "Sua sessão expirou" })).toBeVisible();
  });
});
