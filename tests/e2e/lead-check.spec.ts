import { test, expect, type Page } from "@playwright/test";

/**
 * Tela 1 do funil do lead — o check do WhatsApp (`POST /auth/check`).
 *
 * A rede é interceptada com `page.route`, NÃO com o mock de build
 * (`NEXT_PUBLIC_LEAD_MOCK`): o que precisa ser testado é a fiação de verdade —
 * `lead-api.ts` traduzindo a resposta do backend em "segue pro OTP" ou "abre tal
 * modal". Cada teste abaixo é uma linha do contrato acordado com o backend.
 */

declare global {
  interface Window {
    /** `window.open` capturado (ver `stubExternal`) — o funil manda quem não é lead pra fora. */
    __opened?: string[];
  }
}

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

/** `window.open` vira registro em memória: nada de abrir app.v7m.org de verdade no teste. */
async function stubExternal(page: Page) {
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = ((url?: string | URL) => {
      window.__opened?.push(String(url));
      return null;
    }) as typeof window.open;
  });
}

/** Digita o número e deixa o auto-avanço (240ms após o 11º dígito) disparar o check. */
async function digitar(page: Page, phone = PHONE) {
  await page.getByLabel("Seu WhatsApp").fill(phone);
}

const dialog = (page: Page, title: string | RegExp) => page.getByRole("dialog", { name: title });

test.describe("funil do lead · tela 1 (check)", () => {
  test("número novo cria a conta no check e cai direto no OTP", async ({ page }) => {
    const sent = await stubCheck(page, {});
    await page.goto("/");
    await digitar(page);

    await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
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

  test("quem já é aluno não entra no funil — é mandado pro app.v7m.org", async ({ page }) => {
    await stubExternal(page);
    await stubCheck(page, { found: true, created: false, roles: ["student"] });
    await page.goto("/");
    await digitar(page);

    await expect(dialog(page, "Conta já ativa")).toBeVisible();
    // Aqui não existe área logada (DOCUMENTACAO §19): o redirecionamento é automático.
    await expect
      .poll(() => page.evaluate(() => window.__opened ?? []), { timeout: 6000 })
      .toContain("https://app.v7m.org");
  });

  test("equipe/promotor cai no aviso de outro ambiente e o card fica em erro", async ({ page }) => {
    await stubCheck(page, { found: true, created: false, roles: ["promoter"] });
    await page.goto("/");
    await digitar(page);

    await expect(dialog(page, "Acesso em outro ambiente")).toBeVisible();
    await expect(page.getByLabel("Seu WhatsApp")).toHaveAttribute("aria-invalid", "true");
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
    await page.route(REFERRAL, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: '{"name":null}' }),
    );
    await page.goto("/?ref=promotor-que-nao-existe");

    await expect(page.getByRole("heading", { name: "Passa seu WhatsApp pra mim?" })).toBeVisible();
    await expect(page.getByText("Indicado por")).toHaveCount(0);
    // Selo é enfeite: o funil continua andando normalmente.
    await digitar(page);
    await expect(page.getByRole("heading", { name: "Confirma que é você?" })).toBeVisible();
  });
});
