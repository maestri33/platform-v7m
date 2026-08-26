import { test, expect, type Page } from "@playwright/test";

/**
 * Tela 1 do funil do lead — o check do WhatsApp (`POST /auth/check`).
 *
 * A rede é interceptada com `page.route`, NÃO com o mock de build
 * (`NEXT_PUBLIC_LEAD_MOCK`): o que precisa ser testado é a fiação de verdade —
 * `lead-api.ts` traduzindo a resposta do backend em "segue pro OTP" ou "abre tal
 * modal". Cada teste abaixo é uma linha do contrato acordado com o backend.
 */

const CHECK = "**/api/v1/clients/auth/check";
const REFERRAL = "**/api/v1/clients/referral/*";

const PHONE = "11912345678";
const EXTERNAL_ID = "3f8b1c2e-0a4d-4f11-9e77-2b6d5c8a1e90";

interface CheckOut {
  found: boolean;
  external_id: string | null;
  otp_sent: boolean;
  otp_wait: number | null;
  whatsapp: boolean | null;
  roles: string[] | null;
  created: boolean;
}

/** Caminho feliz: número novo, conta criada no próprio check, código já enviado. */
const NOVO: CheckOut = {
  found: false,
  external_id: EXTERNAL_ID,
  otp_sent: true,
  otp_wait: null,
  whatsapp: true,
  roles: ["lead"],
  created: true,
};

/** Intercepta o check e devolve `body`. O array retornado acumula os corpos enviados. */
async function stubCheck(
  page: Page,
  body: Partial<CheckOut>,
  status = 200,
): Promise<Array<{ phone?: string; ref?: string }>> {
  const sent: Array<{ phone?: string; ref?: string }> = [];
  await page.route(CHECK, async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(status === 200 ? { ...NOVO, ...body } : { detail: "boom" }),
    });
  });
  return sent;
}

/** Digita o número e deixa o auto-avanço (240ms após o 11º dígito) disparar o check. */
async function digitar(page: Page, phone = PHONE) {
  const phoneInput = page.locator("#lead-phone");
  await expect(phoneInput).toBeVisible();
  await phoneInput.click();
  await phoneInput.pressSequentially(phone, { delay: 35 });
  await expect(phoneInput).not.toHaveValue("");
}

const dialog = (page: Page, title: string | RegExp) => page.getByRole("dialog", { name: title });

// Nenhuma chamada destes testes pode ESCAPAR pro proxy /api do dev server: o upstream
// (URL_BACKEND) não existe na máquina de teste e a conexão pendurada vai entupindo o
// server até os goto() começarem a abortar. Registrado ANTES dos stubs específicos —
// no Playwright a rota registrada por último ganha, então isto é só a rede de segurança.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
});

test.describe("funil do lead · tela 1 (check)", () => {
  test("número novo cria a conta no check e cai direto no OTP", async ({ page }) => {
    const sent = await stubCheck(page, {});
    await page.goto("/");
    await digitar(page);

    await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
    // Rotas por passo (2026-07-25): o OTP tem endereço próprio.
    await expect(page).toHaveURL(/\/login$/);
    // A tela do OTP repete o número mascarado — prova que o estado atravessou o passo.
    await expect(page.getByText("(11) 91234-5678")).toBeVisible();
    // O backend recebe só dígitos (o mascaramento é enfeite de tela).
    expect(sent).toHaveLength(1);
    expect(sent[0].phone).toBe(PHONE);

    // A sessão guarda o external_id: é o que o passo 2 (`/auth/login`) vai usar.
    const session = await page.evaluate(() => window.localStorage.getItem("supletivo.session"));
    expect(JSON.parse(session ?? "{}")).toMatchObject({ phone: PHONE, externalId: EXTERNAL_ID });
  });

  test("rate-limit do OTP não é erro: vai pro OTP com o tempo que falta", async ({ page }) => {
    // `otp_sent:false` + `otp_wait` = um código recente JÁ saiu (users/auth/service.py::_send_or_wait).
    await stubCheck(page, { otp_sent: false, otp_wait: 18 });
    await page.goto("/");
    await digitar(page);

    await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
    // A pílula de reenvio nasce vermelha com o cooldown restante (e já descontando).
    await expect(page.getByRole("button", { name: /Reenviar em 1[0-8]s/ })).toBeVisible();
  });

  test("sem OTP enviado e sem cooldown é falha de verdade → modal de servidor", async ({ page }) => {
    await stubCheck(page, { otp_sent: false, otp_wait: null });
    await page.goto("/");
    await digitar(page);

    await expect(dialog(page, /Peraí um tiquinho/)).toBeVisible();
  });

  test("matriculado NÃO é barrado: segue pro OTP aqui mesmo", async ({ page }) => {
    // Regra de casa (2026-07-28): cliente de qualquer role (lead, enrollment, student,
    // veteran) entra AQUI — o gate antigo desviava o pagante pro app.maestri.group e o deixava
    // sem onde digitar o código que este mesmo check disparava.
    await stubCheck(page, { found: true, created: false, roles: ["enrollment"] });
    await page.goto("/");
    await digitar(page);

    await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
  });

  test("aluno (student) também segue pro OTP aqui mesmo", async ({ page }) => {
    await stubCheck(page, { found: true, created: false, roles: ["student"] });
    await page.goto("/");
    await digitar(page);

    await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
  });

  test("equipe/promotor cai no aviso de outro ambiente e o card fica em erro", async ({ page }) => {
    await stubCheck(page, { found: true, created: false, roles: ["promoter"] });
    await page.goto("/");
    await digitar(page);

    await expect(dialog(page, "Acesso em outro ambiente")).toBeVisible();
    await expect(page.getByLabel("Seu WhatsApp")).toHaveAttribute("aria-invalid", "true");
  });

  test("botão do aviso de equipe navega a PRÓPRIA aba pro /login do portal", async ({ page }) => {
    // Mesma aba de propósito: window.open disparado sem gesto era engolido pelo bloqueador
    // de popup e a pessoa ficava presa na tela 1 (E2E 2026-07-28). E o destino é /login
    // porque o check daqui já disparou o OTP — lá é onde o código será digitado.
    await page.route("https://app.maestri.group/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<h1>portal</h1>" }),
    );
    await stubCheck(page, { found: true, created: false, roles: ["promoter"] });
    await page.goto("/");
    await digitar(page);

    await dialog(page, "Acesso em outro ambiente")
      .getByRole("button", { name: /portal/i })
      .click();
    await expect(page).toHaveURL("https://app.maestri.group/login");
  });

  test("WhatsApp inválido bloqueia o número: a segunda tentativa nem sai do aparelho", async ({
    page,
  }) => {
    const sent = await stubCheck(page, { whatsapp: false, created: false, external_id: null });
    await page.goto("/");
    await digitar(page);

    await expect(dialog(page, "Número inválido")).toBeVisible();
    // Fechar limpa o campo — o protótipo não deixa o número recusado preso na tela.
    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(page.getByLabel("Seu WhatsApp")).toHaveValue("");

    await digitar(page);
    await expect(dialog(page, "Número inválido")).toBeVisible();
    expect(sent).toHaveLength(1); // número já anotado como inválido: sem segunda chamada
  });

  test("WhatsApp que não deu pra verificar oferece nova tentativa", async ({ page }) => {
    await stubCheck(page, { whatsapp: null, created: false, external_id: null });
    await page.goto("/");
    await digitar(page);

    await expect(dialog(page, /Não consegui confirmar/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
  });

  test("erro do servidor vira modal transitório, não tela quebrada", async ({ page }) => {
    await stubCheck(page, {}, 500);
    await page.goto("/");
    await digitar(page);

    await expect(dialog(page, /Peraí um tiquinho/)).toBeVisible();
  });

  test("o selo 'Indicado por' usa o NOME resolvido pelo ref, e o ref vai junto no check", async ({
    page,
  }) => {
    const sent = await stubCheck(page, {});
    await page.route(REFERRAL, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: '{"name":"Joana"}' }),
    );
    await page.goto(`/?ref=${EXTERNAL_ID}`);

    // O `?ref=` é um UUID — o que aparece na tela é o primeiro nome do promotor.
    await expect(page.getByText("Indicado por")).toBeVisible();
    await expect(page.getByText("Joana")).toBeVisible();
    await expect(page.getByText(EXTERNAL_ID)).toHaveCount(0);

    await digitar(page);
    await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
    expect(sent[0].ref).toBe(EXTERNAL_ID); // a captação fica amarrada ao promotor
  });

  test("ref que não resolve simplesmente não desenha o selo (e não trava o funil)", async ({
    page,
  }) => {
    await stubCheck(page, {});
    let referralDone = false;
    await page.route(REFERRAL, (route) => {
      referralDone = true;
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"name":null}' });
    });
    await page.goto("/?ref=promotor-que-nao-existe");

    await expect(page.getByRole("heading", { name: "Passa seu WhatsApp pra mim?" })).toBeVisible();
    await expect.poll(() => referralDone).toBe(true);
    await expect(page.getByText("Indicado por")).toHaveCount(0);
    // Selo é enfeite: o funil continua andando normalmente.
    await digitar(page);
    await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
  });
});

test.describe("funil do lead · rotas por passo", () => {
  test("voltar do navegador volta um passo, sem quebrar a máquina", async ({ page }) => {
    await stubCheck(page, {});
    await page.goto("/");
    await digitar(page);
    await expect(page).toHaveURL(/\/login$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Passa seu WhatsApp pra mim?" })).toBeVisible();
    // O número digitado sobrevive à volta (a máquina não remonta na troca de rota).
    await expect(page.getByLabel("Seu WhatsApp")).toHaveValue("(11) 91234-5678");
  });

  test("recarregar em /login retoma o passo com a sessão da tela 1", async ({ page }) => {
    await stubCheck(page, {});
    await page.goto("/");
    await digitar(page);
    await expect(page).toHaveURL(/\/login$/);

    await page.reload();
    // boot(): phone/externalId voltam do localStorage — o passo continua inteiro.
    await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
    await expect(page.getByText("(11) 91234-5678")).toBeVisible();
  });

  test("rota funda sem sessão manda de volta pro começo", async ({ page }) => {
    await page.goto("/cpf");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Passa seu WhatsApp pra mim?" })).toBeVisible();
  });

  test("o ref sobrevive fora da URL: cookie cobre a volta por link limpo", async ({ page }) => {
    const sent = await stubCheck(page, {});
    await page.route(REFERRAL, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: '{"name":"Joana"}' }),
    );
    // 1ª visita chega COM ref (grava o cookie)…
    await page.goto(`/?ref=${EXTERNAL_ID}`);
    await expect(page.getByText("Indicado por")).toBeVisible();

    // …2ª visita chega SEM ref na URL (recarga/link limpo) — o cookie responde.
    await page.goto("/");
    await expect(page.getByText("Indicado por")).toBeVisible();
    await expect(page.getByText("Joana")).toBeVisible();

    await digitar(page);
    await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
    expect(sent[0].ref).toBe(EXTERNAL_ID); // a atribuição não morreu na recarga
  });

  test("/register aposentado redireciona pro funil carregando o ref", async ({ page }) => {
    await page.route(REFERRAL, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: '{"name":"Joana"}' }),
    );
    await page.goto(`/register?ref=${EXTERNAL_ID}`);
    await expect(page).toHaveURL(new RegExp(`/\\?ref=${EXTERNAL_ID}$`));
    await expect(page.getByRole("heading", { name: "Passa seu WhatsApp pra mim?" })).toBeVisible();
  });
});
