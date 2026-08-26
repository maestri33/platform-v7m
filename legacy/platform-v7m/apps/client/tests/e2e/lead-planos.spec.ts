import { test, expect, type Page } from "@playwright/test";

/**
 * Tela 5 do funil do lead — planos (`GET /pricing`, rota pública).
 *
 * O contrato central: os preços dos cards são a VITRINE do backend, não os números
 * do protótipo — mas a vitrine é best-effort: fora do ar, os cards degradam pro
 * fallback em vez de travar o passo 6 (o preço que vale é sempre o do backend na
 * criação do checkout). A chegada do e-mail até aqui já é coberta pelo spec da
 * tela 4; estes testes carregam /planos direto.
 */

const PRICING_URL = "**/api/v1/clients/pricing";

/** Vitrine ≠ protótipo de propósito: prova que o card leu a API, não a constante. */
const VITRINE = {
  pix: "1234.00",
  card: { installments: 10, installment: "150.00", total: "1500.00" },
};

async function stubPricing(page: Page, ok = true) {
  await page.route(PRICING_URL, (route) =>
    ok
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(VITRINE),
        })
      : route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
  );
}

/**
 * Carrega /planos direto, como um lead que recarregou a página no passo 6. A guarda
 * de ENTRADA do funil manda rota funda sem a sessão da tela 1 de volta pro "/" —
 * então o teste semeia a sessão ANTES, senão a tela quica pro check no mount.
 */
async function chegarNosPlanos(page: Page) {
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
  await page.goto("/planos");
  await expect(page.getByRole("heading", { name: "Como você prefere pagar?" })).toBeVisible();
}

// Rede de segurança das telas anteriores: nada escapa pro proxy /api do dev server.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
});

test.describe("funil do lead · tela 5 (planos)", () => {
  test("a barra chega em 4 de 4 — o último passo acende", async ({ page }) => {
    await stubPricing(page);
    await chegarNosPlanos(page);

    await expect(page.getByRole("img", { name: "Etapa 4 de 4 — pagamento" })).toBeVisible();
  });

  test("os preços dos cards vêm da vitrine, não do protótipo", async ({ page }) => {
    await stubPricing(page);
    await chegarNosPlanos(page);

    await expect(page.getByText("R$ 1.234,00")).toBeVisible(); // pix da API
    await expect(page.getByText("de R$ 150,00")).toBeVisible(); // parcela da API
    // String, não regex: o formatBRL separa "R$" do número com NBSP, e só o
    // matcher de string normaliza espaço — regex compararia byte a byte.
    await expect(page.getByText("Total de R$ 1.500,00")).toBeVisible();
    // O número do protótipo NÃO aparece — o card leu a API.
    await expect(page.getByText("R$ 999,00")).toHaveCount(0);
  });

  test("vitrine fora do ar NÃO trava o passo 6: cards degradam pro fallback", async ({ page }) => {
    await stubPricing(page, false);
    await chegarNosPlanos(page);

    await expect(page.getByText("R$ 999,00")).toBeVisible();
    await expect(page.getByText("de R$ 99,00")).toBeVisible();
    await expect(page.getByRole("button", { name: /Escolher Pix/ })).toBeVisible();
  });

  test("Pix expande com o carimbo 'Taxa única' e o preço vivo; confirmar ruma ao checkout", async ({ page }) => {
    await stubPricing(page);
    // A perna confirmar→checkout dispara POST /lead/checkout + poll de /lead/me de
    // verdade. Sem stub, o 404 do catch-all vence a corrida em máquina lenta e o
    // checkout vira tela de erro ANTES de o chip pintar (foi exatamente o flake do CI).
    // URL null + /lead/me pendente = timeline fica em "run", chip estável pra afirmar.
    await page.route("**/api/v1/clients/lead/checkout", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          payment_method: "pix",
          provider: "asaas",
          amount: VITRINE.pix,
          is_paid: false,
          url: null,
        }),
      }),
    );
    await page.route("**/api/v1/clients/lead/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "l1",
          status: "pending",
          created_at: "2026-07-26T00:00:00Z",
          customer: {},
          promoter: { external_id: "p1" },
          checkout: null,
        }),
      }),
    );
    await chegarNosPlanos(page);

    await page.getByRole("button", { name: /Escolher Pix/ }).click();
    const dialog = page.getByRole("dialog", { name: "Confirmar Pix à vista" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Taxa única")).toBeVisible();
    await expect(dialog.getByText("Você não paga mais nada depois")).toBeVisible();
    await expect(dialog.getByText("Na hora")).toBeVisible();
    await expect(dialog.getByText("R$ 1.234,00").first()).toBeVisible();

    await dialog.getByRole("button", { name: "Confirmar e pagar com Pix" }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    // O chip do checkout carrega o MESMO preço vivo — o estado atravessa as telas.
    await expect(page.getByText(/PIX à vista/)).toBeVisible();
    await expect(page.getByText("R$ 1.234,00")).toBeVisible();
  });

  test("cartão expande com parcelas, total e bandeiras; Voltar recolhe", async ({ page }) => {
    await stubPricing(page);
    await chegarNosPlanos(page);

    await page.getByRole("button", { name: /Escolher cartão/ }).click();
    const dialog = page.getByRole("dialog", { name: "Confirmar cartão de crédito" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("10× de R$ 150,00").first()).toBeVisible();
    await expect(dialog.getByText("R$ 1.500,00")).toBeVisible();
    await expect(dialog.getByText("Visa, Master, Elo e mais")).toBeVisible();

    await dialog.getByRole("button", { name: "← Voltar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/planos$/);
  });

  test("clicar no fundo escurecido também recolhe o card expandido", async ({ page }) => {
    await stubPricing(page);
    await chegarNosPlanos(page);

    await page.getByRole("button", { name: /Escolher Pix/ }).click();
    await expect(page.getByRole("dialog", { name: "Confirmar Pix à vista" })).toBeVisible();

    // O backdrop é o próprio dialog (o card interno faz stopPropagation).
    await page.getByRole("dialog", { name: "Confirmar Pix à vista" }).click({ position: { x: 8, y: 8 } });
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
