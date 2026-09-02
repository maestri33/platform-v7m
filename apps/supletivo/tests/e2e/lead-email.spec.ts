import { test, expect, type Page } from "@playwright/test";

/**
 * Tela 4 do funil do lead — e-mail, "campo único, validação viva" (`POST /lead/email`).
 *
 * Como nas telas anteriores, a rede é interceptada com `page.route`: o que se testa é a
 * fiação real de `lead-api.ts` + `use-lead-flow.ts` + `email-domains.ts`, não o mock de build.
 *
 * O contrato central desta tela (DOCUMENTACAO §207-219) é de TOM, e os testes o travam:
 *
 *   1. formato inválido NÃO é modal nem "erro" — é shake + hint gentil no próprio campo;
 *   2. e-mail de outra conta NÃO é modal — é o estado-escudo inline, sem vazar nada do dono;
 *   3. os dois sucessos (novo × já era o seu) mudam SÓ a copy e seguem SOZINHOS pro planos —
 *      o passo 6 do contrato canônico (§46-64), não o painel (que é tela de retorno).
 */

const CHECK = "**/api/v1/clients/auth/check";
const LOGIN = "**/api/v1/clients/auth/login";
const IDENTITY = "**/api/v1/clients/lead/identity";
const EMAIL = "**/api/v1/clients/lead/email";

const PHONE = "11912345678";
const EXTERNAL_ID = "3f8b1c2e-0a4d-4f11-9e77-2b6d5c8a1e90";
const CODE = "123456";
const CPF_OK = "52998224725";

const TOKENS = {
  access_token: "access-de-teste",
  refresh_token: "refresh-de-teste",
  token_type: "bearer",
};

const CHECK_OK = {
  found: false,
  external_id: EXTERNAL_ID,
  otp_sent: true,
  otp_wait: null,
  whatsapp: true,
  roles: ["lead"],
  created: true,
};

const IDENTIDADE = {
  cpf: CPF_OK,
  name: "Maria Aparecida da Silva",
  birth_date: "1979-03-12",
  sex: "F",
  photo: null,
};

type EmailReply =
  | { status: 200; body: { email: string; already_yours: boolean } }
  | { status: number; code: string };

/** Intercepta o passo 5. Como nas outras telas, a última resposta da fila se repete. */
async function stubEmail(page: Page, ...respostas: EmailReply[]) {
  const sent: Array<{ email?: string }> = [];
  const fila: EmailReply[] = respostas.length
    ? respostas
    : [{ status: 200, body: { email: "victor@gmail.com", already_yours: false } }];
  await page.route(EMAIL, async (route) => {
    const r = fila[Math.min(sent.length, fila.length - 1)];
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status: r.status,
      contentType: "application/json",
      body: JSON.stringify("code" in r ? { detail: "nope", code: r.code } : r.body),
    });
  });
  return sent;
}

/** Percorre os passos 1-3 de verdade e para na tela do e-mail, já com JWT guardado. */
async function chegarNoEmail(page: Page) {
  await page.route(CHECK, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CHECK_OK) }),
  );
  await page.route(LOGIN, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TOKENS) }),
  );
  await page.route(IDENTITY, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(IDENTIDADE) }),
  );
  await page.goto("/");
  const phoneInput = page.locator("#lead-phone");
  await phoneInput.click();
  await phoneInput.pressSequentially(PHONE, { delay: 25 });
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Dígito 1").fill(CODE);
  await expect(page).toHaveURL(/\/cpf$/);
  await page.getByLabel("Dígito 1 do CPF").fill(CPF_OK);
  // O pergaminho segura ~5s — "toque para continuar" pula a espera.
  await page.getByRole("button", { name: "toque para continuar" }).click();
  await expect(page).toHaveURL(/\/email$/);
  await expect(page.getByRole("heading", { name: "Qual é seu melhor e-mail?" })).toBeVisible();
}

const campo = (page: Page) => page.getByLabel("Seu melhor e-mail");
const bolinha = (page: Page) => page.locator("[data-email-dot]");
const continuar = (page: Page) => page.getByRole("button", { name: "Continuar" });

// Rede de segurança das telas anteriores: nada escapa pro proxy /api do dev server.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
});

test.describe("funil do lead · tela 4 (e-mail)", () => {
  test("a barra de etapas marca 3 de 4 e o campo chega vazio", async ({ page }) => {
    await stubEmail(page);
    await chegarNoEmail(page);

    await expect(page.getByRole("img", { name: "Etapa 3 de 4 — e-mail" })).toBeVisible();
    await expect(campo(page)).toHaveValue("");
    await expect(bolinha(page)).toHaveAttribute("data-email-dot", "idle");
  });

  test("bolinha viva: cinza vazio, amarela digitando, verde quando o formato fecha", async ({ page }) => {
    await stubEmail(page);
    await chegarNoEmail(page);

    await campo(page).fill("victor");
    await expect(bolinha(page)).toHaveAttribute("data-email-dot", "checking");
    // 350ms de debounce depois, "victor" continua sem formato → segue amarela.
    await page.waitForTimeout(500);
    await expect(bolinha(page)).toHaveAttribute("data-email-dot", "checking");

    await campo(page).fill("victor@gmail.com");
    await expect(bolinha(page)).toHaveAttribute("data-email-dot", "valid");

    await campo(page).fill("");
    await expect(bolinha(page)).toHaveAttribute("data-email-dot", "idle");
  });

  test("typo de domínio sugere a correção e 'Usar' aplica", async ({ page }) => {
    const sent = await stubEmail(page);
    await chegarNoEmail(page);

    await campo(page).fill("victor@gmial.com");
    await expect(page.getByText(/Você quis dizer/)).toBeVisible();
    await expect(page.getByText("victor@gmail.com")).toBeVisible();

    await page.getByRole("button", { name: "Usar victor@gmail.com" }).click();
    await expect(campo(page)).toHaveValue("victor@gmail.com");
    await expect(page.getByText(/Você quis dizer/)).toHaveCount(0);
    await expect(bolinha(page)).toHaveAttribute("data-email-dot", "valid");
    expect(sent).toHaveLength(0); // sugestão é conversa de teclado, não de rede
  });

  test("autocomplete parcial sugere, e 'Manter mesmo assim' cala pro valor exato", async ({ page }) => {
    await stubEmail(page);
    await chegarNoEmail(page);

    await campo(page).fill("victor@g");
    await expect(page.getByText(/Você quis dizer/)).toBeVisible();

    await page.getByRole("button", { name: "Manter mesmo assim" }).click();
    await expect(page.getByText(/Você quis dizer/)).toHaveCount(0);

    // Mudou uma letra → o "manter" era pro valor exato, a sugestão volta.
    await campo(page).fill("victor@gm");
    await expect(page.getByText(/Você quis dizer/)).toBeVisible();
  });

  test("descartável ganha aviso gentil mas NÃO bloqueia o caminho", async ({ page }) => {
    await stubEmail(page, {
      status: 200,
      body: { email: "user@mailinator.com", already_yours: false },
    });
    await chegarNoEmail(page);

    await campo(page).fill("user@mailinator.com");
    await expect(page.getByText(/parece um e-mail temporário/)).toBeVisible();

    await continuar(page).click();
    await expect(page.getByText("Excelente!")).toBeVisible();
    await expect(page).toHaveURL(/\/planos$/, { timeout: 8000 });
  });

  test("formato inválido: shake + hint no campo — sem modal, sem rede, sem 'erro'", async ({ page }) => {
    const sent = await stubEmail(page);
    await chegarNoEmail(page);

    await campo(page).fill("sem-arroba");
    await campo(page).press("Enter");

    await expect(page.getByText(/Ainda falta um pequeno detalhe/)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Escopado ao conteúdo: o overlay de DEV do Next carrega "Error" em shadow DOM.
    await expect(page.locator("#conteudo").getByText(/erro/i)).toHaveCount(0);
    expect(sent).toHaveLength(0);
    // O campo fica como está — revisar é ver o que se digitou.
    await expect(campo(page)).toHaveValue("sem-arroba");
  });

  test("e-mail novo: 'Excelente!', envelope voa e o funil segue sozinho pro planos", async ({ page }) => {
    const sent = await stubEmail(page, {
      status: 200,
      body: { email: "victor@gmail.com", already_yours: false },
    });
    await chegarNoEmail(page);

    await campo(page).fill("victor@gmail.com");
    await continuar(page).click();

    await expect(page.getByText("Excelente!")).toBeVisible();
    expect(sent).toEqual([{ email: "victor@gmail.com" }]);
    await expect(page.getByText("E-mail confirmado!")).toBeVisible({ timeout: 4000 });
    // Sem clicar em nada: sucesso → planos é o passo 6 do contrato (§46-64).
    await expect(page).toHaveURL(/\/planos$/, { timeout: 8000 });
  });

  test("e-mail que JÁ era o seu: copy própria e o mesmo caminho sozinho", async ({ page }) => {
    await stubEmail(page, {
      status: 200,
      body: { email: "victor@gmail.com", already_yours: true },
    });
    await chegarNoEmail(page);

    await campo(page).fill("victor@gmail.com");
    await continuar(page).click();

    await expect(page.getByText("Perfeito, já é o seu e-mail")).toBeVisible();
    await expect(page.getByText("Excelente!")).toHaveCount(0);
    await expect(page).toHaveURL(/\/planos$/, { timeout: 8000 });
  });

  test("e-mail de outra conta: escudo inline, sem modal e sem vazar nada do dono", async ({ page }) => {
    await stubEmail(page, { status: 409, code: "EMAIL_CONFLICT" });
    await chegarNoEmail(page);

    await campo(page).fill("outro@gmail.com");
    await continuar(page).click();

    await expect(page.getByText("Esse e-mail já está protegido")).toBeVisible();
    // §216: "Sem modal de erro" — o escudo mora DENTRO do card da tela.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(/Maria|Aparecida|Silva/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Falar com o suporte" })).toBeVisible();
  });

  test("'Trocar e-mail' volta ao campo limpo, pronto pra outro endereço", async ({ page }) => {
    await stubEmail(page, { status: 409, code: "EMAIL_CONFLICT" });
    await chegarNoEmail(page);

    await campo(page).fill("outro@gmail.com");
    await continuar(page).click();
    await page.getByRole("button", { name: "Trocar e-mail" }).click();

    await expect(campo(page)).toHaveValue("");
    await expect(bolinha(page)).toHaveAttribute("data-email-dot", "idle");
    await expect(page.getByText("Esse e-mail já está protegido")).toHaveCount(0);
  });

  test("422 do backend cai no mesmo hint gentil — é a última linha da validação", async ({ page }) => {
    await stubEmail(page, { status: 422, code: "EMAIL_INVALID" });
    await chegarNoEmail(page);

    await campo(page).fill("valido@naparede.com");
    await continuar(page).click();

    await expect(page.getByText(/Ainda falta um pequeno detalhe/)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("erro transitório vira modal com retry, e o retry re-envia o mesmo e-mail", async ({ page }) => {
    const sent = await stubEmail(
      page,
      { status: 500, code: "BOOM" },
      { status: 200, body: { email: "victor@gmail.com", already_yours: false } },
    );
    await chegarNoEmail(page);

    await campo(page).fill("victor@gmail.com");
    await continuar(page).click();

    const modal = page.getByRole("dialog", { name: "Peraí um tiquinho…" });
    await expect(modal).toBeVisible();
    await modal.getByRole("button").first().click();

    await expect(page.getByText("Excelente!")).toBeVisible();
    expect(sent).toEqual([{ email: "victor@gmail.com" }, { email: "victor@gmail.com" }]);
    await expect(page).toHaveURL(/\/planos$/, { timeout: 8000 });
  });
});
