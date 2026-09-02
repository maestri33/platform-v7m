import { test, expect, type Page } from "@playwright/test";

/**
 * Tela 3 do funil do lead — CPF + pergaminho (`POST /lead/identity`).
 *
 * Como nas telas 1 e 2, a rede é interceptada com `page.route`: o que se testa é a fiação real
 * de `lead-api.ts` + `use-lead-flow.ts`, não o mock de build.
 *
 * O contrato central desta tela é de SEGURANÇA (DOCUMENTACAO §72/§191). Quando o CPF já é de
 * outra conta, o backend faz três coisas de uma vez: notifica o titular real, APAGA a conta
 * criada nesta tentativa e responde 409 `CPF_CONFLICT` sem nome nem dado pessoal. Isso tem duas
 * consequências que os testes abaixo travam:
 *
 *   1. a tela não pode mostrar de quem é o CPF — é justamente o que um atacante foi buscar;
 *   2. a sessão deste aparelho aponta pra um usuário que não existe mais e precisa morrer
 *      junto, senão sobra um JWT órfão que empurra o funil pra um 401 sem explicação.
 *
 * O protótipo ainda desenha "Cadastrado como {nome}" nesse caso — desenho antigo, revogado
 * textualmente pelo DOCUMENTACAO §152 ("não mostra mais o nome"). A spec vence.
 */

const CHECK = "**/api/v1/clients/auth/check";
const LOGIN = "**/api/v1/clients/auth/login";
const IDENTITY = "**/api/v1/clients/lead/identity";

const PHONE = "11912345678";
const EXTERNAL_ID = "3f8b1c2e-0a4d-4f11-9e77-2b6d5c8a1e90";
const CODE = "123456";

/** CPFs com dígito verificador VÁLIDO (clássicos de teste) — o front os deixa passar. */
const CPF_OK = "52998224725";
const CPF_OUTRO = "11144477735";
/** DV quebrado: o `isValidCpf` barra antes de qualquer rede. */
const CPF_DV_RUIM = "12345678900";

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

interface Identity {
  cpf: string;
  name: string | null;
  birth_date: string | null;
  sex: string | null;
  photo: string | null;
}

/** 1×1 PNG transparente: foto de verdade pro <img>, sem sair pra rede. */
const FOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const IDENTIDADE: Identity = {
  cpf: CPF_OK,
  name: "Maria Aparecida da Silva",
  birth_date: "1979-03-12",
  sex: "F",
  photo: null,
};

type IdentityReply = { status: 200; body: Identity } | { status: number; code: string };

/** Intercepta o passo 3. Como nas outras telas, a última resposta da fila se repete. */
async function stubIdentity(page: Page, ...respostas: IdentityReply[]) {
  const sent: Array<{ cpf?: string }> = [];
  const fila: IdentityReply[] = respostas.length
    ? respostas
    : [{ status: 200, body: IDENTIDADE }];
  await page.route(IDENTITY, async (route) => {
    const r = fila[Math.min(sent.length, fila.length - 1)];
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status: r.status,
      contentType: "application/json",
      // Narrowing pela chave (o membro de erro tem `status: number`, que engloba 200).
      body: JSON.stringify("code" in r ? { detail: "nope", code: r.code } : r.body),
    });
  });
  return sent;
}

const dialog = (page: Page, title: string | RegExp) => page.getByRole("dialog", { name: title });

/** Percorre os passos 1 e 2 de verdade e para na tela do CPF, já com JWT guardado. */
async function chegarNoCpf(page: Page) {
  await page.route(CHECK, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CHECK_OK) }),
  );
  await page.route(LOGIN, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TOKENS) }),
  );
  await page.goto("/");
  const phoneInput = page.locator("#lead-phone");
  await phoneInput.click();
  await phoneInput.pressSequentially(PHONE, { delay: 25 });
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Dígito 1").fill(CODE);
  await expect(page).toHaveURL(/\/cpf$/);
  await expect(page.getByRole("heading", { name: "Qual é o seu CPF?" })).toBeVisible();
}

/** A 1ª caixa aceita os 11 dígitos e distribui pelas outras (mesmo modelo do OTP). */
const digitarCpf = (page: Page, cpf: string) => page.getByLabel("Dígito 1 do CPF").fill(cpf);

const pergaminho = (page: Page) => page.getByRole("region", { name: /^Identidade confirmada:/ });

// Rede de segurança das telas anteriores: nada escapa pro proxy /api do dev server.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
});

test.describe("funil do lead · tela 3 (CPF + pergaminho)", () => {
  test("a barra de etapas avança pra 2 de 4 e some quando o pergaminho abre", async ({ page }) => {
    await stubIdentity(page);
    await chegarNoCpf(page);
    await expect(page.getByRole("img", { name: "Etapa 2 de 4 — CPF" })).toBeVisible();

    await digitarCpf(page, CPF_OK);
    await expect(pergaminho(page)).toBeVisible();
    // No reveal a tela é documento, não formulário: a barra competiria com ele.
    await expect(page.getByRole("img", { name: /^Etapa/ })).toHaveCount(0);
  });

  test("CPF válido manda os 11 dígitos e abre o pergaminho com nome e idade", async ({ page }) => {
    const sent = await stubIdentity(page);
    await chegarNoCpf(page);
    await digitarCpf(page, CPF_OK);

    // O pergaminho primeiro: `digitarCpf` só preenche o campo, e o disparo passa por um
    // debounce de 180ms — conferir `sent` antes disso testaria a velocidade do teste.
    await expect(pergaminho(page)).toBeVisible();
    expect(sent).toEqual([{ cpf: CPF_OK }]);
    await expect(page.getByText("Maria Aparecida da Silva")).toBeVisible();
    // Nascida em 12/03/1979 — a idade sai do `birth_date`, não de um mock congelado.
    const hoje = new Date();
    const jaFezAniversario =
      hoje.getMonth() + 1 > 3 || (hoje.getMonth() + 1 === 3 && hoje.getDate() >= 12);
    const idade = hoje.getFullYear() - 1979 - (jaFezAniversario ? 0 : 1);
    await expect(page.getByText(`Depois de ${idade} anos,`)).toBeVisible();
  });

  test("sem foto no zap o pergaminho usa o monograma, sem parecer erro", async ({ page }) => {
    await stubIdentity(page, { status: 200, body: { ...IDENTIDADE, photo: null } });
    await chegarNoCpf(page);
    await digitarCpf(page, CPF_OK);

    await expect(pergaminho(page)).toBeVisible();
    await expect(pergaminho(page).locator("img")).toHaveCount(0);
    // Iniciais = primeiro + último nome ("Maria … Silva").
    await expect(pergaminho(page).getByText("MS", { exact: true })).toBeVisible();
  });

  test("com foto do WhatsApp, o retrato real entra no lugar do monograma", async ({ page }) => {
    await stubIdentity(page, { status: 200, body: { ...IDENTIDADE, photo: FOTO } });
    await chegarNoCpf(page);
    await digitarCpf(page, CPF_OK);

    await expect(pergaminho(page).locator("img")).toHaveAttribute("src", FOTO);
  });

  test("sem data de nascimento, a linha da idade some em vez de sair vazia", async ({ page }) => {
    await stubIdentity(page, { status: 200, body: { ...IDENTIDADE, birth_date: null } });
    await chegarNoCpf(page);
    await digitarCpf(page, CPF_OK);

    await expect(pergaminho(page)).toBeVisible();
    await expect(page.getByText(/Depois de/)).toHaveCount(0);
    // O resto do documento continua de pé — a ausência degrada, não quebra.
    await expect(page.getByText("Maria Aparecida da Silva")).toBeVisible();
  });

  test("dígito verificador errado nem chega a chamar a API", async ({ page }) => {
    const sent = await stubIdentity(page);
    await chegarNoCpf(page);
    await digitarCpf(page, CPF_DV_RUIM);

    await expect(dialog(page, "Vamos conferir esse CPF?")).toBeVisible();
    expect(sent).toHaveLength(0); // conta errada é problema de aritmética, não de rede
  });

  test("422 do backend cai no mesmo sheet — é a última linha da validação", async ({ page }) => {
    await stubIdentity(page, { status: 422, code: "CPF_INVALID" });
    await chegarNoCpf(page);
    await digitarCpf(page, CPF_OK);

    await expect(dialog(page, "Vamos conferir esse CPF?")).toBeVisible();
    await expect(pergaminho(page)).toHaveCount(0);
  });

  test("CPF de outra conta protege a identidade: sheet sem nome nenhum", async ({ page }) => {
    await stubIdentity(page, { status: 409, code: "CPF_CONFLICT" });
    await chegarNoCpf(page);
    await digitarCpf(page, CPF_OUTRO);

    const sheet = dialog(page, "Sua identidade está protegida");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Recuperar acesso" })).toBeVisible();
    // O ponto todo do contrato: nada do titular vaza. Nem nome, nem rótulo que o anuncie.
    await expect(sheet.getByText(/Cadastrado como/i)).toHaveCount(0);
    await expect(sheet.getByText("Maria Aparecida da Silva")).toHaveCount(0);
    // E o usuário fica sabendo que a tentativa foi desfeita (o backend desfaz de verdade).
    await expect(sheet.getByText(/desfizemos o cadastro deste número/i)).toBeVisible();
  });

  test("no conflito a sessão morre na hora, não no botão do sheet", async ({ page }) => {
    await stubIdentity(page, { status: 409, code: "CPF_CONFLICT" });
    await chegarNoCpf(page);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("supletivo.login")))
      .not.toBeNull();

    await digitarCpf(page, CPF_OUTRO);
    await expect(dialog(page, "Sua identidade está protegida")).toBeVisible();

    // O backend APAGOU a conta: o JWT guardado aqui aponta pra um usuário que não existe.
    // Ele cai junto com o 409 — não quando alguém clica no botão. Quem fecha pelo Esc ou
    // pelo fundo não pode continuar o funil carregando um token órfão.
    await page.keyboard.press("Escape");
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("supletivo.login")))
      .toBeNull();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("supletivo.session")))
      .toBeNull();
  });

  test("'Recuperar acesso' devolve ao passo 1 com o campo limpo", async ({ page }) => {
    await stubIdentity(page, { status: 409, code: "CPF_CONFLICT" });
    await chegarNoCpf(page);
    await digitarCpf(page, CPF_OUTRO);

    await dialog(page, "Sua identidade está protegida")
      .getByRole("button", { name: "Recuperar acesso" })
      .click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByLabel("Seu WhatsApp")).toHaveValue("");
  });

  test("conta que já confirmou outro CPF é assunto do suporte", async ({ page }) => {
    await stubIdentity(page, { status: 409, code: "CPF_ALREADY_SET" });
    await chegarNoCpf(page);
    await digitarCpf(page, CPF_OK);

    await expect(dialog(page, "Falar com o suporte")).toBeVisible();
  });

  test("CPFHub fora vira modal de servidor, com saída de tentar de novo", async ({ page }) => {
    await stubIdentity(page, { status: 502, code: "CPF_SERVICE_DOWN" }, { status: 200, body: IDENTIDADE });
    await chegarNoCpf(page);
    await digitarCpf(page, CPF_OK);

    const modal = dialog(page, "Peraí um tiquinho…");
    await expect(modal).toBeVisible();
    // Erro transitório: o botão re-executa a consulta com o CPF que já está no campo.
    await modal.getByRole("button").first().click();
    await expect(pergaminho(page)).toBeVisible();
  });

  test("'toque para continuar' pula a espera e vai pro e-mail", async ({ page }) => {
    await stubIdentity(page);
    await chegarNoCpf(page);
    await digitarCpf(page, CPF_OK);

    await page.getByRole("button", { name: "toque para continuar" }).click();
    await expect(page).toHaveURL(/\/email$/);
  });
});
