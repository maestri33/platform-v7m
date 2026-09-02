import { test, expect, type Page } from "@playwright/test";

/**
 * Tela 7 do funil do lead — painel de retorno (`GET /lead/me`).
 *
 * O contrato central: o painel é a tela de quem SAIU e VOLTOU, já com checkout
 * gerado. O card fala do checkout VIGENTE (forma + valor que será cobrado, não a
 * vitrine) e o CTA "Quero mudar de vida →" RETOMA o pagamento reusando a URL
 * viva — recriar a sessão aqui mataria o PIX antigo (o plano é explícito).
 * Só 2 estados: lead (falta pagar) e paid (→ matrícula).
 */

const ME = "**/api/v1/clients/lead/me";
const CHECKOUT = "**/api/v1/clients/lead/checkout";
const URL_GATEWAY = "https://pagamento.parceiro.com.br/c/VIVA77";

const ME_PENDING = {
  external_id: "l1",
  status: "pending",
  created_at: "2026-07-20T00:00:00Z",
  customer: { name: "José Carlos de Souza", cpf: "52998224725", email: "jose@gmail.com" },
  promoter: { external_id: "p1" },
  checkout: {
    payment_method: "card",
    provider: "asaas",
    amount: "1188.00",
    is_paid: false,
    url: URL_GATEWAY,
  },
};

async function stubMe(page: Page, body: unknown, status = 200) {
  await page.route(ME, (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }),
  );
}

async function chegarNoPainel(page: Page) {
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
  await page.goto("/painel");
}

// Rede de segurança das telas anteriores: nada escapa pro proxy /api do dev server.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
});

test.describe("funil do lead · tela 7 (painel de retorno)", () => {
  test("o retrato vem do /lead/me: nome real no pergaminho e checkout vigente no card", async ({ page }) => {
    await stubMe(page, ME_PENDING);
    await chegarNoPainel(page);

    // Nome REAL — não o placeholder do protótipo.
    await expect(
      page.getByRole("heading", { name: "Sua vaga continua te esperando, José" }),
    ).toBeVisible();
    await expect(page.getByText("JOSÉ CARLOS DE SOUZA")).toBeVisible();
    await expect(page.getByText("Maria Aparecida da Silva")).toHaveCount(0);
    // Forma e VALOR vigentes (o que será cobrado), não a vitrine.
    await expect(page.getByText("Cartão de crédito")).toBeVisible();
    await expect(page.getByText("R$ 1.188,00", { exact: false })).toBeVisible();
    await expect(page.getByText("Pagamento já preparado")).toBeVisible();
  });

  test("'Quero mudar de vida →' REUSA a URL viva — sem recriar a sessão", async ({ page }) => {
    await stubMe(page, ME_PENDING);
    const recriacoes: unknown[] = [];
    await page.route(CHECKOUT, (route) => {
      recriacoes.push(route.request().postDataJSON());
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.route("https://pagamento.parceiro.com.br/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<h1>gateway de pagamento</h1>" }),
    );
    await chegarNoPainel(page);

    await expect(page.getByText("Pagamento já preparado")).toBeVisible();
    await page.getByRole("button", { name: "Quero mudar de vida →" }).click();

    await page.waitForURL(/pagamento\.parceiro\.com\.br/, { timeout: 8000 });
    expect(recriacoes).toHaveLength(0); // reusar ≠ recriar: o PIX antigo continua vivo
  });

  test("'Trocar' devolve aos planos pra escolher outra forma", async ({ page }) => {
    await stubMe(page, ME_PENDING);
    await chegarNoPainel(page);

    await page.getByRole("button", { name: "Trocar" }).click();
    await expect(page).toHaveURL(/\/planos$/);
    await expect(page.getByRole("heading", { name: "Como você prefere pagar?" })).toBeVisible();
  });

  test("pagou → o lugar da pessoa é a matrícula, não o painel", async ({ page }) => {
    await stubMe(page, { ...ME_PENDING, status: "paid" });
    await chegarNoPainel(page);

    await page.waitForURL(/\/matricula/, { timeout: 8000 });
  });

  test("sem checkout nenhum: card some e o CTA leva aos planos", async ({ page }) => {
    await stubMe(page, { ...ME_PENDING, checkout: null });
    await chegarNoPainel(page);

    await expect(
      page.getByRole("heading", { name: "Sua vaga continua te esperando, José" }),
    ).toBeVisible();
    await expect(page.getByText("Pagamento já preparado")).toHaveCount(0);

    await page.getByRole("button", { name: "Quero mudar de vida →" }).click();
    await expect(page).toHaveURL(/\/planos$/);
  });

  test("/lead/me fora do ar: o painel DEGRADA em vez de travar a tela de retorno", async ({ page }) => {
    await stubMe(page, { detail: "boom" }, 500);
    await chegarNoPainel(page);

    // Sem retrato, a tela fica de pé com o estado local — e o CTA segue com saída.
    await expect(page.getByRole("heading", { name: /Sua vaga continua te esperando/ })).toBeVisible();
    await page.getByRole("button", { name: "Quero mudar de vida →" }).click();
    await expect(page).toHaveURL(/\/planos$/);
  });

  test("sessão morta no retrato → modal de sessão expirada", async ({ page }) => {
    await page.route("**/api/v1/clients/auth/refresh", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "morto" }) }),
    );
    await stubMe(page, { detail: "expirado" }, 401);
    await chegarNoPainel(page);

    await expect(page.getByRole("dialog", { name: "Sua sessão expirou" })).toBeVisible();
  });
});
