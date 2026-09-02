import { test, expect, type Page } from "@playwright/test";

/**
 * Passo 2 da matrícula — ENDEREÇO, comprovante-PRIMEIRO (Victor 2026-07-28).
 *
 * Regras de casa:
 *  - o COMPROVANTE entra antes de qualquer digitação; a IA extrai e popula o endereço —
 *    o formulário vira confirmação (e nem aparece se a extração completar tudo);
 *  - classificação rápida antes do envio: identidade aqui é o tipo errado;
 *  - titular outro: "confirm" (sobrenome em comum → só o grau) × "justify" (sem relação
 *    aparente → justificar o vínculo) — dois tons no chat;
 *  - justificativa rejeitada pelo coordenador → `needs_new_proof`: a tela TRAVA no
 *    comprovante pedindo outro documento, de preferência no nome do aluno.
 */

const ME = "**/api/v1/clients/enrollment/me";
const PROOF = "**/api/v1/clients/enrollment/address/proof";
const CLASSIFY = "**/api/v1/clients/enrollment/documents/classify";

const PROOF_VAZIO = {
  exists: false,
  photo: null,
  status: null,
  reason: null,
  needs_kinship: false,
  kinship_kind: null,
  kinship_relation: null,
  needs_new_proof: false,
};

/** Justificativa rejeitada pelo coordenador: trava pedindo documento no nome do aluno. */
const PROOF_NOVO_DOC = {
  ...PROOF_VAZIO,
  exists: true,
  photo: "proofs/conta.jpg",
  status: "rejected",
  reason:
    "Precisamos de outro comprovante de residência — de preferência no SEU nome " +
    "(conta de luz, água, internet ou telefone dos últimos 90 dias).",
  needs_new_proof: true,
};

const PROOF_CONFIRM = {
  ...PROOF_VAZIO,
  exists: true,
  photo: "proofs/conta.jpg",
  status: "needs_kinship",
  reason: "O comprovante está no nome de Ana Paula Maestri. Confirma pra gente o grau de parentesco?",
  needs_kinship: true,
  kinship_kind: "confirm",
};

const PROOF_JUSTIFY = {
  ...PROOF_VAZIO,
  exists: true,
  photo: "proofs/conta.jpg",
  status: "needs_kinship",
  reason: "O comprovante está no nome de João Carlos. Conta pra gente qual é o seu vínculo com esse endereço?",
  needs_kinship: true,
  kinship_kind: "justify",
};

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function me(proof: unknown, status = "address") {
  return { external_id: "e1", status, address_proof: proof, address_complete: false };
}

async function stubMe(page: Page, body: unknown) {
  await page.route(ME, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }),
  );
}

/** Classificador reconhece um comprovante (o caminho feliz do tipo). */
async function stubClassifyProof(page: Page, doc_type = "address_proof") {
  await page.route(CLASSIFY, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ is_document: true, doc_type, completeness: null, confidence: 0.95 }),
    }),
  );
}

async function abrir(page: Page, proof: unknown) {
  await stubMe(page, me(proof));
  await stubClassifyProof(page);
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

async function escolherArquivo(page: Page, mimeType = "image/jpeg") {
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "conta.jpg",
    mimeType,
    buffer: PNG_1PX,
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
});

test.describe("matrícula · passo do endereço (comprovante-primeiro)", () => {
  test("abre pedindo o COMPROVANTE — nada de formulário antes", async ({ page }) => {
    await abrir(page, PROOF_VAZIO);

    await expect(page.getByText(/Envie um comprovante de residência/)).toBeVisible();
    await expect(page.getByLabel("CEP")).toHaveCount(0);
  });

  test("classificou como comprovante → envio liberado no slot certo", async ({ page }) => {
    let posted = false;
    await page.route(PROOF, async (route) => {
      posted = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(me({ ...PROOF_VAZIO, exists: true, status: "pending" })),
      });
    });
    await abrir(page, PROOF_VAZIO);
    await escolherArquivo(page);
    await expect(page.getByText(/Reconhecemos seu comprovante/)).toBeVisible();

    const botao = page.getByRole("button", { name: "Enviar comprovante" });
    await expect(botao).toBeEnabled();
    await page.evaluate(() =>
      document.querySelectorAll('[data-testid="copilot-error-banner"]').forEach((el) => el.remove()),
    );
    await botao.click();
    await expect.poll(() => posted).toBe(true);
  });

  test("RG no passo do comprovante = tipo errado, envio bloqueado", async ({ page }) => {
    await abrir(page, PROOF_VAZIO);
    await page.unroute(CLASSIFY);
    await stubClassifyProof(page, "rg");
    await escolherArquivo(page);

    await expect(page.getByText("Isso parece um documento de identidade")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar comprovante" })).toBeDisabled();
  });

  test("sobrenome em comum: chat de CONFIRMAR o grau de parentesco", async ({ page }) => {
    await abrir(page, PROOF_CONFIRM);

    await expect(page.getByRole("heading", { name: "Qual é o parentesco?" })).toBeVisible();
  });

  test("nome sem relação: chat de JUSTIFICAR o vínculo", async ({ page }) => {
    await abrir(page, PROOF_JUSTIFY);

    await expect(page.getByRole("heading", { name: "De quem é a conta?" })).toBeVisible();
  });

  test("justificativa rejeitada trava no comprovante pedindo documento no nome do aluno", async ({
    page,
  }) => {
    await abrir(page, PROOF_NOVO_DOC);

    // O aviso aparece no parágrafo E no modal — o primeiro basta (strict mode exige escolha).
    await expect(page.getByText(/de preferência no SEU nome/).first()).toBeVisible();
    // Preso no upload: sem formulário, sem chat — só o caminho do novo comprovante.
    await expect(page.getByLabel("CEP")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "De quem é a conta?" })).toHaveCount(0);
  });

  test("comprovante aprovado mas endereço incompleto → formulário de confirmação", async ({
    page,
  }) => {
    await abrir(page, { ...PROOF_VAZIO, exists: true, status: "approved" });

    await expect(page.getByLabel("CEP")).toBeVisible();
  });
});
