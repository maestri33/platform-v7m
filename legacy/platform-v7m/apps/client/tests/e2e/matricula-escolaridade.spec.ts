import { test, expect, type Page } from "@playwright/test";

/**
 * Passo 3 da matrícula — ESCOLARIDADE por eliminação (Victor 2026-07-28).
 *
 * Onde parou (primário/ginásio/médio, nomes da época) → qual ano (cards com as duas
 * nomenclaturas) → terminou aquele ano? → UF/cidade (IBGE). O contrato do backend não muda:
 * primário/ginásio são recortes do fundamental (grade = numeração atual), médio 1–3.
 */

const ME = "**/api/v1/clients/enrollment/me";
const EDU = "**/api/v1/clients/enrollment/education";
// IBGE é chamado direto pelo front (client-side).
const IBGE_UF = "https://servicodados.ibge.gov.br/api/v1/localidades/estados**";
const IBGE_CITY = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/*/municipios**";

async function stubIbge(page: Page) {
  await page.route(IBGE_UF, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: 41, sigla: "PR", nome: "Paraná" }]),
    }),
  );
  await page.route(IBGE_CITY, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ nome: "Ponta Grossa" }, { nome: "Curitiba" }]),
    }),
  );
}

async function abrir(page: Page, education: unknown = null) {
  await page.route(ME, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ external_id: "e1", status: "education", education }),
    }),
  );
  await stubIbge(page);
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

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
});

test.describe("matrícula · escolaridade (eliminação)", () => {
  test("abre perguntando ONDE parou — três níveis pelos nomes da época", async ({ page }) => {
    await abrir(page);

    await expect(page.getByRole("heading", { name: "Onde você parou de estudar?" })).toBeVisible();
    await expect(page.getByText("Primário")).toBeVisible();
    await expect(page.getByText("Do Pré à 4ª série")).toBeVisible();
    await expect(page.getByText("Ginásio")).toBeVisible();
    await expect(page.getByText("Ensino Médio")).toBeVisible();
  });

  test("primário → cards de ano com as DUAS nomenclaturas", async ({ page }) => {
    await abrir(page);
    await page.getByText("Primário").click();

    await expect(page.getByRole("heading", { name: /Até que ano do Primário/ })).toBeVisible();
    await expect(page.getByText("4ª série", { exact: true })).toBeVisible();
    await expect(page.getByText("hoje: 5º ano")).toBeVisible();
    // primário não tem "5ª série" (isso é ginásio)
    await expect(page.getByText("5ª série", { exact: true })).toHaveCount(0);
  });

  test("caminho completo: ginásio → 6ª série → terminei → PR/Ponta Grossa envia grade=7", async ({
    page,
  }) => {
    let sent: Record<string, unknown> | null = null;
    await page.route(EDU, async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external_id: "e1", status: "selfie", education: null }),
      });
    });
    await abrir(page);

    await page.getByText("Ginásio").click();
    await page.getByText("6ª série", { exact: true }).click(); // 6ª série = hoje 7º = grade 7
    await expect(page.getByRole("heading", { name: /você terminou/ })).toBeVisible();
    await page.getByText("Terminei o ano").click();

    await expect(page.getByRole("heading", { name: /Onde você estudou/ })).toBeVisible();
    await page.getByLabel("Estado (UF)").selectOption("PR");
    await page.getByLabel("Cidade da escola").selectOption("Ponta Grossa");

    await page.evaluate(() =>
      document.querySelectorAll('[data-testid="copilot-error-banner"]').forEach((el) => el.remove()),
    );
    await page.getByRole("button", { name: "Salvar e continuar" }).click();

    await expect.poll(() => sent).not.toBeNull();
    expect(sent).toMatchObject({
      level: "fundamental",
      grade: 7,
      completed: true,
      state: "PR",
      city: "Ponta Grossa",
    });
  });

  test("não terminei/repeti → completed=false", async ({ page }) => {
    let sent: Record<string, unknown> | null = null;
    await page.route(EDU, async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external_id: "e1", status: "selfie", education: null }),
      });
    });
    await abrir(page);

    await page.getByText("Primário").click();
    await page.getByText("2ª série", { exact: true }).click(); // hoje 3º = grade 3
    await page.getByText("Não terminei").click();
    await page.getByLabel("Estado (UF)").selectOption("PR");
    await page.getByLabel("Cidade da escola").selectOption("Curitiba");
    await page.evaluate(() =>
      document.querySelectorAll('[data-testid="copilot-error-banner"]').forEach((el) => el.remove()),
    );
    await page.getByRole("button", { name: "Salvar e continuar" }).click();

    await expect.poll(() => sent).not.toBeNull();
    expect(sent).toMatchObject({ level: "fundamental", grade: 3, completed: false });
  });

  test("médio 3º ano concluído: avisa que não é caso de supletivo e barra o envio", async ({
    page,
  }) => {
    await abrir(page);

    await page.getByText("Ensino Médio").click();
    await page.getByText("3º ano", { exact: true }).click();
    await page.getByText("Terminei o ano").click();

    await expect(page.getByText(/concluiu o 3º ano do Ensino Médio/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar e continuar" })).toBeDisabled();
  });
});
