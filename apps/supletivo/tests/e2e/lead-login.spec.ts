import { test, expect, type Page } from "@playwright/test";

/**
 * Tela 2 do funil do lead — o OTP (`POST /auth/login`).
 *
 * Como na tela 1, a rede é interceptada com `page.route` e não pelo mock de build: o que se
 * testa é a fiação real de `lead-api.ts` + `use-lead-flow.ts`. O contrato central desta tela
 * é o 401 em DOIS sabores, acertado com o backend nesta mesma leva:
 *
 *   OTP_INVALID → errou o código, ele CONTINUA valendo (👀 "digita de novo")
 *   OTP_EXPIRED → não existe código utilizável (venceu, esgotou tentativas ou já foi usado);
 *                 a única saída é outro código (⏳ + reenvio automático)
 *
 * Com um 401 genérico, quem esgotasse as tentativas ficava preso digitando um código que
 * nunca mais ia passar — inclusive o correto.
 */

const CHECK = "**/api/v1/clients/auth/check";
const LOGIN = "**/api/v1/clients/auth/login";

const PHONE = "11912345678";
const PHONE_MASK = "(11) 91234-5678";
const EXTERNAL_ID = "3f8b1c2e-0a4d-4f11-9e77-2b6d5c8a1e90";
const CODE = "123456";

const TOKENS = {
  access_token: "access-de-teste",
  refresh_token: "refresh-de-teste",
  token_type: "bearer",
};

interface CheckOut {
  found: boolean;
  external_id: string | null;
  otp_sent: boolean;
  otp_wait: number | null;
  whatsapp: boolean | null;
  roles: string[] | null;
  created: boolean;
}

const NOVO: CheckOut = {
  found: false,
  external_id: EXTERNAL_ID,
  otp_sent: true,
  otp_wait: null,
  whatsapp: true,
  roles: ["lead"],
  created: true,
};

/**
 * Intercepta o check. `respostas` é consumida em ordem e a ÚLTIMA se repete — é o que
 * permite escrever "a 1ª chamada sai, a 2ª volta rate-limitada" sem contador manual.
 * O array devolvido acumula os corpos enviados (o reenvio é uma chamada a mais aqui).
 */
async function stubCheck(page: Page, ...respostas: Array<Partial<CheckOut>>) {
  const sent: Array<{ phone?: string; ref?: string }> = [];
  const fila = respostas.length ? respostas : [{}];
  await page.route(CHECK, async (route) => {
    const body = fila[Math.min(sent.length, fila.length - 1)];
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...NOVO, ...body }),
    });
  });
  return sent;
}

type LoginReply = { status: 200; body?: unknown } | { status: number; code: string };

/** Intercepta o login. Mesma regra da fila: a última resposta se repete. */
async function stubLogin(page: Page, ...respostas: LoginReply[]) {
  const sent: Array<{ external_id?: string; otp?: string }> = [];
  await page.route(LOGIN, async (route) => {
    const r = respostas[Math.min(sent.length, respostas.length - 1)];
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status: r.status,
      contentType: "application/json",
      // Narrowing pela chave, não pelo status: `status: number` engloba 200 e o
      // TypeScript não consegue descartar o membro de erro comparando com literal.
      body: JSON.stringify("code" in r ? { detail: "nope", code: r.code } : TOKENS),
    });
  });
  return sent;
}

const dialog = (page: Page, title: string | RegExp) => page.getByRole("dialog", { name: title });

/** Entra pelo passo 1 e para na tela do OTP — é assim que a pessoa chega aqui de verdade. */
async function chegarNoOtp(page: Page) {
  await page.goto("/");
  const phoneInput = page.locator("#lead-phone");
  await phoneInput.click();
  await phoneInput.pressSequentially(PHONE, { delay: 25 });
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
}

/** A 1ª caixa aceita o código inteiro (autocomplete one-time-code) e distribui pelas outras. */
async function digitarCodigo(page: Page, code = CODE) {
  await page.getByLabel("Dígito 1").fill(code);
}

/** Semeia a sessão do aparelho sem passar pelo funil — é o estado de quem volta de fora. */
async function semearSessao(page: Page) {
  await page.addInitScript(
    ([phone, externalId]) => {
      window.localStorage.setItem(
        "supletivo.session",
        JSON.stringify({ phone, externalId, ref: null }),
      );
    },
    [PHONE, EXTERNAL_ID],
  );
}

// Mesma rede de segurança da tela 1: nada pode escapar pro proxy /api do dev server.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
});

test.describe("funil do lead · tela 2 (OTP)", () => {
  test("o OTP é onde a barra de etapas aparece, marcando 1 de 4", async ({ page }) => {
    await stubCheck(page);
    await page.goto("/");
    // Na tela do telefone ainda não existe barra: quem só digitou o número não sabe que
    // entrou num funil, e anunciar "1 de 4" ali seria mostrar o trabalho antes do vínculo.
    await expect(page.getByRole("img", { name: /^Etapa/ })).toHaveCount(0);

    const phoneInput = page.locator("#lead-phone");
    await phoneInput.click();
    await phoneInput.pressSequentially(PHONE, { delay: 25 });
    await expect(page.getByRole("img", { name: "Etapa 1 de 4 — código" })).toBeVisible();
  });

  test("código certo troca por JWT e segue pro passo 3", async ({ page }) => {
    await stubCheck(page);
    const sent = await stubLogin(page, { status: 200 });
    await chegarNoOtp(page);
    await digitarCodigo(page);

    await expect(page).toHaveURL(/\/cpf$/);
    // O login manda o external_id guardado pelo check — não o telefone.
    expect(sent).toEqual([{ external_id: EXTERNAL_ID, otp: CODE }]);
    // Os tokens ficam guardados: é o que autentica os passos 3 em diante.
    const login = await page.evaluate(() => window.localStorage.getItem("supletivo.login"));
    expect(JSON.parse(login ?? "{}")).toMatchObject({
      access_token: TOKENS.access_token,
      refresh_token: TOKENS.refresh_token,
    });
  });

  test("código errado (OTP_INVALID): 👀 e o MESMO código segue valendo", async ({ page }) => {
    const checks = await stubCheck(page);
    const logins = await stubLogin(page, { status: 401, code: "OTP_INVALID" }, { status: 200 });
    await chegarNoOtp(page);
    await digitarCodigo(page, "000000");

    await expect(dialog(page, "Código incorreto")).toBeVisible();
    // A diferença que justifica o contrato: NENHUM código novo foi pedido (o antigo vale).
    expect(checks).toHaveLength(1);

    await page.getByRole("button", { name: "Digitar de novo" }).click();
    // Fechar limpa as caixas — a pessoa não apaga 6 dígitos na mão.
    await expect(page.getByLabel("Dígito 1")).toHaveValue("");

    await digitarCodigo(page);
    await expect(page).toHaveURL(/\/cpf$/);
    expect(logins).toHaveLength(2);
  });

  test("código morto (OTP_EXPIRED): ⏳ e um código novo sai sozinho", async ({ page }) => {
    const checks = await stubCheck(page);
    await stubLogin(page, { status: 401, code: "OTP_EXPIRED" });
    await chegarNoOtp(page);
    await digitarCodigo(page, "111111");

    await expect(dialog(page, /Esse código venceu/)).toBeVisible();
    // A copy promete "já disparei um novinho" — então o pedido tem que sair de fato.
    await expect.poll(() => checks.length).toBe(2);
    expect(checks[1].phone).toBe(PHONE);
    // Sem 🚀 por cima do ⏳: um modal de cada vez, e o ⏳ já conta a história.
    await expect(dialog(page, /Código novo a caminho/)).toHaveCount(0);

    await page.getByRole("button", { name: "Beleza, já vi" }).click();
    await expect(page.getByLabel("Dígito 1")).toHaveValue("");
  });

  test("logo depois de receber o código, reenviar fica travado", async ({ page }) => {
    // Forma real de "o código saiu": `otp_sent:true` com `otp_wait:null` (users/auth/service.py
    // ::_send_or_wait). Sem número do backend, o cooldown é o do protótipo — 30s.
    const checks = await stubCheck(page);
    await chegarNoOtp(page);

    const travada = page.getByRole("button", { name: /Reenviar em \d+s/ });
    await expect(travada).toBeVisible();
    await expect(travada).toBeDisabled();
    expect(checks).toHaveLength(1); // pílula travada = nenhum pedido a mais
  });

  test("com o cooldown vencido, reenviar pede outro código e anuncia o 🚀", async ({ page }) => {
    // Chegada rate-limitada (o passo 1 esbarrou no limite, resta 1s): é a única forma real de
    // ter a pílula liberando rápido — `otp_wait` só existe quando NADA foi enviado.
    const checks = await stubCheck(page, { otp_sent: false, otp_wait: 1 }, {});
    await chegarNoOtp(page);

    const reenviar = page.getByRole("button", { name: "Reenviar código" });
    await expect(reenviar).toBeEnabled();
    await reenviar.click();

    await expect(dialog(page, /Código novo a caminho/)).toBeVisible();
    expect(checks).toHaveLength(2);
  });

  test("reenvio rate-limitado não mente: repõe o cooldown e cala o 🚀", async ({ page }) => {
    // 2ª resposta: `otp_sent:false` + `otp_wait` = o backend NÃO mandou nada desta vez.
    await stubCheck(page, { otp_sent: false, otp_wait: 1 }, { otp_sent: false, otp_wait: 25 });
    await chegarNoOtp(page);

    const reenviar = page.getByRole("button", { name: "Reenviar código" });
    await expect(reenviar).toBeEnabled();
    await reenviar.click();

    await expect(page.getByRole("button", { name: /Reenviar em 2[0-5]s/ })).toBeVisible();
    await expect(dialog(page, /Código novo a caminho/)).toHaveCount(0);
  });

  test("external_id que o backend não conhece: recomeçar é a única saída", async ({ page }) => {
    await stubCheck(page);
    await stubLogin(page, { status: 404, code: "USER_NOT_FOUND" });
    await chegarNoOtp(page);
    await digitarCodigo(page);

    await expect(dialog(page, "Sua sessão expirou")).toBeVisible();
    await page.getByRole("button", { name: "Entrar de novo" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Passa seu WhatsApp pra mim?" })).toBeVisible();
    // A sessão podre vai junto: insistir nela levaria ao mesmo 404 pra sempre.
    const session = await page.evaluate(() => window.localStorage.getItem("supletivo.session"));
    expect(session).toBeNull();
  });

  test("timeout/erro do servidor no login vira modal transitório", async ({ page }) => {
    await stubCheck(page);
    await stubLogin(page, { status: 500, code: "BOOM" });
    await chegarNoOtp(page);
    await digitarCodigo(page);

    await expect(dialog(page, /Peraí um tiquinho/)).toBeVisible();
  });
});

test.describe("funil do lead · tela 2 (re-login de quem já passou do lead)", () => {
  test("/login?relogin=1 dispara o código sozinho, com a sessão do aparelho", async ({ page }) => {
    await semearSessao(page);
    const checks = await stubCheck(page, { found: true, created: false, roles: ["enrollment"] });
    await page.goto("/login?relogin=1");

    await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
    // Ninguém digitou nada: o pedido saiu no mount, com o telefone que já estava guardado.
    await expect.poll(() => checks.length).toBe(1);
    expect(checks[0].phone).toBe(PHONE);
    await expect(page.getByText(PHONE_MASK)).toBeVisible();
  });

  test("no re-login o gate de role não barra: enrollment volta pra /matricula", async ({ page }) => {
    await semearSessao(page);
    // Pelo funil normal, `enrollment` levaria ao modal 🎓 "já é aluno". Aqui não pode:
    // barrar quem voltou de /matricula seria expulsar a pessoa do próprio app.
    await stubCheck(page, { found: true, created: false, roles: ["enrollment"] });
    await stubLogin(page, { status: 200 });
    await page.goto("/login?relogin=1");

    await expect(dialog(page, "Conta já ativa")).toHaveCount(0);
    await digitarCodigo(page);
    await expect(page).toHaveURL(/\/matricula$/);
  });

  test("aluno volta pro app do aluno, não pro funil", async ({ page }) => {
    await semearSessao(page);
    await stubCheck(page, { found: true, created: false, roles: ["student"] });
    await stubLogin(page, { status: 200 });
    await page.goto("/login?relogin=1");

    await digitarCodigo(page);
    await expect(page).toHaveURL(/\/aluno$/);
  });

  test("sem `?relogin=1` a tela não pede código nenhum sozinha", async ({ page }) => {
    await semearSessao(page);
    const checks = await stubCheck(page);
    await page.goto("/login");

    // Recarga no meio do funil repõe a sessão (boot) — mas NÃO dispara OTP: o código
    // que já chegou continua valendo, e reenviar sem pedir queimaria o anterior.
    await expect(page.getByText(PHONE_MASK)).toBeVisible();
    await expect(page.getByRole("button", { name: "Reenviar código" })).toBeEnabled();
    expect(checks).toHaveLength(0);
  });
});
