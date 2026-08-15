import { test, expect, type Page } from "@playwright/test";

/**
 * Passo 1 da matrícula — DOCUMENTO (RG).
 *
 * Regras de casa (Victor 2026-07-28):
 *  - o RG pode vir de dois jeitos: **um lado por vez** (frente valida → pede o verso) ou
 *    **os dois no mesmo arquivo** (slot `full`);
 *  - foto ou arquivo, JPG/PNG/**PDF**;
 *  - quem valida é a IA, ASSÍNCRONA: o upload responde na hora e a tela acompanha;
 *  - reprovou → o aluno lê o que FAZER, nunca o critério. O motivo técnico (lado trocado,
 *    nome divergente, suspeita de adulteração) é do hub/staff — não desce pro cliente.
 */

const RG = "**/api/v1/clients/enrollment/documents/rg";
const RG_PHOTO = "**/api/v1/clients/enrollment/documents/rg/photo/*";
const CLASSIFY = "**/api/v1/clients/enrollment/documents/classify";
const ME = "**/api/v1/clients/enrollment/me";

/** Seção vazia: nada enviado ainda — a tela pede a frente. */
const VAZIO = {
  number: null,
  issuing_agency: null,
  issue_date: null,
  front_photo: null,
  back_photo: null,
  full_photo: null,
  analysis_status: null,
  analysis_reason: null,
  validation_status: null,
  validation_reason: null,
  missing_fields: [],
  blocked: false,
  next_slot: "rg_front",
  photos: {},
};

/** O que o backend devolve quando a IA REPROVA: orientação, sem o porquê técnico. */
const REPROVADO = {
  ...VAZIO,
  front_photo: "rg/front.jpg",
  analysis_status: "rejected",
  analysis_reason:
    "Não deu pra validar esse documento. Manda de novo: foto nítida, sem reflexo, " +
    "com as quatro bordas aparecendo e o documento preenchendo a tela.",
  validation_status: "rejected",
  blocked: true,
  photos: { rg_front: { status: "rejected" } },
};

/**
 * Frente aprovada, verso faltando. A SEÇÃO segue `pending` de propósito (ela só fecha quando
 * os dois lados passam) — o que manda aqui é o `next_slot`. Ler o pending da seção como
 * "analisando" prendia a pessoa no spinner sem nunca pedir o verso.
 */
const FRENTE_OK = {
  ...VAZIO,
  front_photo: "rg/front.jpg",
  analysis_status: "pending",
  validation_status: "pending",
  next_slot: "rg_back",
  photos: { rg_front: { status: "approved" } },
};

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function stubRg(page: Page, body: unknown) {
  await page.route(RG, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }),
  );
}

/** Captura os slots que o front realmente enviou (`front` | `back` | `full`). */
async function stubUpload(page: Page): Promise<string[]> {
  const slots: string[] = [];
  await page.route(RG_PHOTO, async (route) => {
    slots.push(new URL(route.request().url()).pathname.split("/").pop() ?? "");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ slot: "front", analysis: "pending", analysis_status: "pending" }),
    });
  });
  return slots;
}

/** O classificador rápido roda ANTES do envio; aqui ele sempre reconhece um RG. */
async function stubClassify(page: Page) {
  await page.route(CLASSIFY, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ doc_type: "rg", completeness: "front", confidence: 0.97 }),
    }),
  );
}

async function abrirMatricula(page: Page, rg: unknown) {
  await page.route(ME, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ external_id: "e1", status: "rg", rg }),
    }),
  );
  await stubRg(page, rg);
  await stubClassify(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "supletivo.login",
      JSON.stringify({ access_token: "a", refresh_token: "r", token_type: "bearer" }),
    );
    window.localStorage.setItem(
      "supletivo.session",
      JSON.stringify({ phone: "11912345678", externalId: "3f8b1c2e-0a4d-4f11-9e77-2b6d5c8a1e90" }),
    );
  });
  await page.goto("/matricula");
}

async function escolherArquivo(page: Page, name = "rg.png", mimeType = "image/png") {
  await page.locator('input[type="file"]').first().setInputFiles({
    name,
    mimeType,
    buffer: PNG_1PX,
  });
}

/**
 * Clica o botão do rodapé do wizard.
 *
 * `force` porque o CopilotKit (chat do passo do COMPROVANTE) desenha um banner de erro FIXO
 * quando seu runtime não responde — e nos stubs ele nunca responde. O banner cobre o rodapé e
 * o Playwright recusa o clique por hit-target, mesmo com o botão visível e habilitado. É
 * obstáculo de ambiente, não do passo do documento; o que este teste mede é o que o front
 * ENVIA depois do clique.
 */
async function enviar(page: Page, nome: RegExp) {
  const botao = page.getByRole("button", { name: nome });
  // O botão só libera quando o classificador rápido volta (ele roda ao escolher o arquivo).
  await expect(botao).toBeEnabled({ timeout: 15_000 });
  // O banner de erro do CopilotKit (chat do passo do COMPROVANTE, runtime stubado em 404)
  // cobre o rodapé e engole o clique — até com force, os eventos vão pras coordenadas.
  // Ruído de ambiente: some com ele na hora do clique.
  await page.evaluate(() =>
    document.querySelectorAll('[data-testid="copilot-error-banner"]').forEach((el) => el.remove()),
  );
  await botao.click();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
});

test.describe("matrícula · passo do documento (RG)", () => {
  test("começa pedindo a FRENTE e oferece os dois jeitos de enviar", async ({ page }) => {
    await abrirMatricula(page, VAZIO);

    await expect(page.getByText("Envie a FRENTE do seu RG.")).toBeVisible();
    await expect(page.getByRole("radio", { name: "Um lado por vez" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Os dois num arquivo" })).toBeVisible();
  });

  test("um lado por vez: envia no slot `front`", async ({ page }) => {
    const slots = await stubUpload(page);
    await abrirMatricula(page, VAZIO);
    await escolherArquivo(page);
    await enviar(page, /Enviar e validar/);

    await expect.poll(() => slots).toContain("front");
  });

  test("os dois num arquivo: envia no slot `full`", async ({ page }) => {
    const slots = await stubUpload(page);
    await abrirMatricula(page, VAZIO);

    await page.getByRole("radio", { name: "Os dois num arquivo" }).click();
    await expect(page.getByText("Envie o arquivo com os DOIS lados do seu RG.")).toBeVisible();
    await escolherArquivo(page);
    await enviar(page, /Enviar e validar/);

    await expect.poll(() => slots).toContain("full");
    expect(slots).not.toContain("front");
  });

  test("aceita PDF, não só foto", async ({ page }) => {
    const slots = await stubUpload(page);
    await abrirMatricula(page, VAZIO);
    await escolherArquivo(page, "rg.pdf", "application/pdf");
    await enviar(page, /Enviar e validar/);

    await expect.poll(() => slots).toContain("front");
  });

  test("frente aprovada → a tela pede o VERSO (e não deixa trocar de modo no meio)", async ({
    page,
  }) => {
    await abrirMatricula(page, FRENTE_OK);

    await expect(page.getByText("Frente aprovada! Envie o VERSO do seu RG.")).toBeVisible();
    await expect(page.getByRole("radio", { name: "Os dois num arquivo" })).toHaveCount(0);
  });

  test("reprovado: o aluno lê o que FAZER — o critério da IA não desce pro cliente", async ({
    page,
  }) => {
    await abrirMatricula(page, REPROVADO);

    await expect(page.getByText(/Manda de novo/)).toBeVisible();
    // Nada de motivo técnico na tela de quem está se matriculando.
    await expect(page.getByText(/nome.*não confere/i)).toHaveCount(0);
    await expect(page.getByText(/adultera|fraude|rasura/i)).toHaveCount(0);
  });

  test("/matricula/rg é linkável e cai no passo do documento", async ({ page }) => {
    await abrirMatricula(page, VAZIO);
    await page.goto("/matricula/rg");

    await expect(page).toHaveURL(/\/matricula$/);
    await expect(page.getByText("Envie a FRENTE do seu RG.")).toBeVisible();
  });
});
