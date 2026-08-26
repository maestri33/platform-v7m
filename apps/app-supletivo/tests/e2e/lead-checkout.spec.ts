import { test, expect, type Page } from "@playwright/test";

/**
 * Tela 6 do funil do lead — checkout (`POST /lead/checkout` + acompanhamento por
 * `GET /lead/me`).
 *
 * Contratos centrais:
 * 1. A timeline é TEATRO e a API é quem manda — interrompe quando a resposta chega,
 *    e o destino é o REDIRECT pro gateway (`window.location`, spec §228).
 * 2. Erro de criação NUNCA vira modal: tela elegante com saídas (§229).
 * 3. Entrada FRIA (voltar do gateway, reload) NÃO recria a sessão — recriar
 *    re-redirecionava num loop sem saída e matava o PIX anterior (achado do teste
 *    e2e de 2026-07-28). Quem volta PARA: fase `resume`, com a sessão viva e
 *    três saídas. A criação acontece só pelo caminho real: planos → confirmar.
 */

const CHECKOUT = "**/api/v1/clients/lead/checkout";
const ME = "**/api/v1/clients/lead/me";
const PRICING = "**/api/v1/clients/pricing";
const GATEWAY = "https://pagamento.parceiro.com.br/**";
const URL_GATEWAY = "https://pagamento.parceiro.com.br/c/E2E123";

const CO_OK = {
  payment_method: "pix",
  provider: "asaas",
  amount: "999.00",
  is_paid: false,
  url: URL_GATEWAY,
};

const VITRINE = { pix: "999.00", card: { installments: 12, installment: "99.00", total: "1188.00" } };

const ME_PENDING = {
  external_id: "l1",
  status: "pending",
  created_at: "2026-07-20T00:00:00Z",
  customer: { name: "Maria Aparecida da Silva" },
  promoter: { external_id: "p1" },
  checkout: CO_OK,
};

type Reply = { status: number; body: unknown };

/** Intercepta a criação. Como nas outras telas, a última resposta da fila se repete.
 * `delayMs` segura a resposta — necessário pra AFIRMAR o teatro da fase `run`, porque a
 * timeline interrompe assim que a API responde (por design) e um stub instantâneo no
 * servidor de produção pula a fase antes de o expect rodar. */
async function stubCheckout(page: Page, delayMs: number, ...respostas: Reply[]) {
  const sent: Array<{ payment_method?: string }> = [];
  const fila: Reply[] = respostas.length ? respostas : [{ status: 200, body: CO_OK }];
  await page.route(CHECKOUT, async (route) => {
    const r = fila[Math.min(sent.length, fila.length - 1)];
    sent.push(route.request().postDataJSON());
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
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

async function seedSession(page: Page) {
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
}

/** Caminho REAL até o checkout: planos → Escolher Pix → confirmar. */
async function chegarNoCheckout(page: Page) {
  await seedSession(page);
  await page.route(PRICING, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(VITRINE) }),
  );
  await page.goto("/planos");
  await page.getByRole("button", { name: /Escolher Pix/ }).click();
  await page.getByRole("button", { name: "Confirmar e pagar com Pix" }).click();
  // Sem assert de URL aqui: um 409 instantâneo (ALREADY_PAID/PROFILE_INCOMPLETE) já
  // navegou pro destino antes de o /checkout assentar — cada teste afirma o seu.
}

// Rede de segurança das telas anteriores: nada escapa pro proxy /api do dev server.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
});

test.describe("funil do lead · tela 6 (checkout)", () => {
  test("timeline roda, interrompe quando a URL chega e REDIRECIONA pro gateway", async ({ page }) => {
    const sent = await stubCheckout(page, 1200);
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
    await stubCheckout(page, 0, { status: 200, body: { ...CO_OK, url: null, checkout_url: null } });
    await stubGateway(page);
    // 1ª consulta ainda sem URL; a 2ª traz — o poll precisa seguir vivo até ela vir.
    let consultas = 0;
    await page.route(ME, (route) => {
      consultas += 1;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...ME_PENDING, checkout: consultas < 2 ? { ...CO_OK, url: null } : CO_OK }),
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
    const sent = await stubCheckout(page, 0, { status: 500, body: { detail: "boom" } }, { status: 200, body: CO_OK });
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
    await stubCheckout(page, 0, { status: 500, body: { detail: "boom" } });
    await chegarNoCheckout(page);

    await page.getByRole("button", { name: "Escolher outra forma de pagamento" }).click();
    await expect(page).toHaveURL(/\/planos$/);
    await expect(page.getByRole("heading", { name: "Como você prefere pagar?" })).toBeVisible();
  });

  test("ALREADY_PAID não cria outro checkout: o lugar de quem pagou é o painel", async ({ page }) => {
    await stubCheckout(page, 0, { status: 409, body: { detail: "pago", code: "ALREADY_PAID" } });
    await chegarNoCheckout(page);

    await expect(page).toHaveURL(/\/painel$/);
  });

  test("PROFILE_INCOMPLETE devolve pro primeiro passo que falta", async ({ page }) => {
    await stubCheckout(page, 0, {
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
    await stubCheckout(page, 0, { status: 401, body: { detail: "expirado" } });
    await chegarNoCheckout(page);

    await expect(page.getByRole("dialog", { name: "Sua sessão expirou" })).toBeVisible();
  });

  /* ── Entrada FRIA: voltar do gateway / recarregar (o achado de 2026-07-28) ── */

  test("voltar do gateway NÃO recria nem re-redireciona: fase resume, com a sessão viva", async ({ page }) => {
    const recriacoes = await stubCheckout(page, 0);
    await stubGateway(page);
    await seedSession(page);
    await page.route(ME, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ME_PENDING) }),
    );
    await page.goto("/checkout");

    await expect(page.getByRole("heading", { name: "Seu pagamento continua aberto" })).toBeVisible();
    await expect(page.getByText(URL_GATEWAY)).toBeVisible();
    // O ponto todo: NADA acontece sozinho — sem POST novo, sem navegação automática.
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/checkout$/);
    expect(recriacoes).toHaveLength(0);

    // Quem decide é a pessoa: continuar leva ao gateway…
    await page.getByRole("button", { name: "Continuar para o pagamento →" }).click();
    await page.waitForURL(/pagamento\.parceiro\.com\.br/, { timeout: 8000 });
  });

  test("no resume, 'Trocar forma de pagamento' devolve aos planos", async ({ page }) => {
    await stubCheckout(page, 0);
    await seedSession(page);
    await page.route(PRICING, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(VITRINE) }),
    );
    await page.route(ME, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ME_PENDING) }),
    );
    await page.goto("/checkout");

    await page.getByRole("button", { name: "Trocar forma de pagamento" }).click();
    await expect(page).toHaveURL(/\/planos$/);
  });

  test("entrada fria de quem JÁ pagou vai pra matrícula", async ({ page }) => {
    await seedSession(page);
    await page.route(ME, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...ME_PENDING, status: "paid" }) }),
    );
    await page.goto("/checkout");

    await page.waitForURL(/\/matricula/, { timeout: 8000 });
  });

  test("entrada fria sem checkout nenhum devolve aos planos", async ({ page }) => {
    await seedSession(page);
    await page.route(PRICING, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(VITRINE) }),
    );
    await page.route(ME, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...ME_PENDING, checkout: null }) }),
    );
    await page.goto("/checkout");

    await expect(page).toHaveURL(/\/planos$/, { timeout: 8000 });
    await expect(page.getByRole("heading", { name: "Como você prefere pagar?" })).toBeVisible();
  });
});
