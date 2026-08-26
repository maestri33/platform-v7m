import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";

async function openEducation(page: Page, request: APIRequestContext) {
  await request.post(`${mockBackend}/__reset`);
  await page.goto("/");
  await page.getByLabel(/^CPF$/i).fill("52998224725");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await request.post(`${mockBackend}/__stage?status=pix&pix=1`);
  await page.goto("/escolaridade");
}

test("conversa prepara resumo sem controles genéricos do CopilotKit", async ({ page, request }) => {
  await openEducation(page, request);

  await page.getByLabel("Resposta sobre sua escolaridade").fill("Parei no 8º ano em 2010, em Curitiba.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(page.getByText("Antes disso, você chegou a concluir o 7º ano?", { exact: true })).toBeVisible();
  await page.getByLabel("Resposta sobre sua escolaridade").fill("Sim, concluí o 7º ano.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();

  await expect(page.getByText("Confira o que entendemos", { exact: true })).toBeVisible();
  await expect(page.getByText("8º ano", { exact: true })).toBeVisible();
  await expect(page.getByText("7º ano", { exact: true })).toBeVisible();
  await expect(page.getByText("Parei antes de terminar", { exact: true })).toBeVisible();
  await expect(page.getByText("2010", { exact: true })).toBeVisible();
  await expect(page.getByText("Curitiba", { exact: true })).toBeVisible();
  await expect(page.getByText("9º ano", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Confirmar e continuar" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Stop" })).toHaveCount(0);
  await expect(page.getByText("Powered by CopilotKit")).toHaveCount(0);
});

test("entende nomenclatura escolar antiga sem reduzir a série", async ({ page, request }) => {
  await openEducation(page, request);

  await page
    .getByLabel("Resposta sobre sua escolaridade")
    .fill("Concluí a antiga 8ª série em 2004.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();

  await expect(page.getByText("Ensino Fundamental", { exact: true })).toBeVisible();
  await expect(page.getByText("9º ano / antiga 8ª série", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Concluí essa série/ano", { exact: true })).toBeVisible();
  await expect(page.getByText("2004", { exact: true })).toBeVisible();
  await expect(page.getByText("8º ano", { exact: true })).toHaveCount(0);
});

test("continua a conversa usando rascunho estruturado e histórico curto", async ({ page, request }) => {
  const requests: Array<{
    draft?: {
      level?: string;
      grade?: number;
      lastCompletedGrade?: number | null;
      educationStatus?: string;
      year?: string;
    };
    history?: Array<{ role: string; content: string }>;
  }> = [];
  await page.route("**/api/me/education/assistant", async (route) => {
    requests.push(route.request().postDataJSON());
    const turn = requests.length;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply:
          turn === 1
            ? "Antes disso, você chegou a concluir o 7º ano?"
            : turn === 2
              ? "Em que ano isso aconteceu?"
              : "Entendi. Confira o resumo abaixo antes de continuar.",
        ready: turn === 3,
        draft: {
          stage: "fundamental",
          level: "fundamental",
          grade: 8,
          last_completed_grade: turn === 1 ? null : 7,
          education_status: "stopped",
          year: turn === 3 ? 2010 : null,
          city: "",
          school: "",
        },
      }),
    });
  });
  await openEducation(page, request);

  const input = page.getByLabel("Resposta sobre sua escolaridade");
  await input.fill("Parei no 8º ano.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(page.getByText("Antes disso, você chegou a concluir o 7º ano?", { exact: true })).toBeVisible();
  await input.fill("Sim, concluí o 7º ano.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(page.getByText("Em que ano isso aconteceu?", { exact: true })).toBeVisible();
  await input.fill("Em 2010.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();

  await expect(page.getByText("Confira o que entendemos", { exact: true })).toBeVisible();
  expect(requests[1].draft).toMatchObject({
    level: "fundamental",
    grade: 8,
    lastCompletedGrade: null,
    educationStatus: "stopped",
    year: "",
  });
  expect(requests[2].draft).toMatchObject({ lastCompletedGrade: 7 });
  expect(requests[2].history?.at(-1)).toEqual({
    role: "assistant",
    content: "Em que ano isso aconteceu?",
  });
});

test("escolaridade continua pelas opções quando a IA estiver indisponível", async ({ page, request }) => {
  await page.route("**/api/me/education/assistant", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "offline" }) }),
  );
  await openEducation(page, request);

  await expect(page.getByText("Assistente de escolaridade", { exact: true })).toBeVisible();
  await page.getByLabel("Resposta sobre sua escolaridade").fill("Parei no 8º ano.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(page.getByText("O assistente não respondeu agora.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continuar pelas opções" }).click();
  await page.getByRole("button", { name: "Ensino Médio" }).click();
  await page.getByRole("button", { name: "Não, parei durante essa etapa" }).click();
  await page.getByRole("button", { name: "1º ano do Ensino Médio" }).click();
  await expect(page.getByRole("button", { name: "Confirmar e continuar" })).toBeEnabled();
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await expect(page.getByText(/Informe um ano entre 1950/)).toBeVisible();
  await page.getByLabel("Em que ano isso aconteceu?").fill("2024");
  await page.getByLabel("Cidade onde estudou (opcional)").fill("Ponta Grossa");
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();

  await expect(page).toHaveURL(/\/painel$/);
});

test("rascunho manual sobrevive ao recarregamento", async ({ page, request }) => {
  await openEducation(page, request);
  await page.getByRole("button", { name: "Responder por opções" }).click();
  await page.getByRole("button", { name: "Ensino Fundamental" }).click();
  await page.getByRole("button", { name: "Ainda estou estudando" }).click();
  await page.getByRole("button", { name: "8º ano" }).click();
  await page.getByRole("button", { name: "Sim, concluí" }).click();
  await page.getByLabel("Em que ano começou essa série?").fill("2026");
  await page.getByLabel("Nome da escola (opcional)").fill("Escola Exemplo");
  await page.reload();
  await page.getByRole("button", { name: "Responder por opções" }).click();

  await expect(page.getByLabel("Em que ano começou essa série?")).toHaveValue("2026");
  await expect(page.getByLabel("Nome da escola (opcional)")).toHaveValue("Escola Exemplo");
  await expect(page.getByText("Confirmado: 7º ano.", { exact: true })).toBeVisible();
});

test("corrige o caminho sem perder respostas e salva o último ano concluído", async ({ page, request }) => {
  await openEducation(page, request);
  await page.getByRole("button", { name: "Responder por opções" }).click();
  await page.getByRole("button", { name: "Ensino Fundamental" }).click();
  await page.getByRole("button", { name: "Não, parei durante essa etapa" }).click();
  await page.getByRole("button", { name: "7º ano" }).click();
  await page.getByRole("button", { name: "Ainda não tinha concluído" }).click();
  await page.getByRole("button", { name: "5º ano" }).click();
  await page.getByLabel("Em que ano isso aconteceu?").fill("2003");

  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("heading", { name: "Antes disso, você chegou a concluir o 6º ano?" })).toBeVisible();
  await page.getByRole("button", { name: "Ainda não tinha concluído" }).click();
  await page.getByRole("button", { name: "5º ano" }).click();
  await expect(page.getByLabel("Em que ano isso aconteceu?")).toHaveValue("2003");

  const educationRequest = page.waitForRequest((pendingRequest) =>
    pendingRequest.url().endsWith("/api/me/education") && pendingRequest.method() === "POST",
  );
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  const payload = (await educationRequest).postDataJSON();

  expect(payload).toMatchObject({
    level: "fundamental",
    grade: 7,
    last_completed_grade: 5,
    education_status: "stopped",
    city: null,
    school: null,
  });
  await expect(page).toHaveURL(/\/painel$/);
});

test("entende superior incompleto sem perder a comprovação do médio", async ({ page, request }) => {
  await openEducation(page, request);
  await page
    .getByLabel("Resposta sobre sua escolaridade")
    .fill("Parei no mestrado em 2024, mas concluí a graduação.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();

  await expect(page.getByText("Confira o que entendemos", { exact: true })).toBeVisible();
  await expect(page.getByText("Ensino Superior", { exact: true })).toBeVisible();
  await expect(page.getByText("Mestrado", { exact: true })).toBeVisible();
  await expect(page.getByText("Graduação", { exact: true })).toBeVisible();
  await expect(page.getByText("Parei antes de terminar", { exact: true })).toBeVisible();
});

test("entende doutorado concluído como formação superior completa", async ({ page, request }) => {
  await openEducation(page, request);
  await page
    .getByLabel("Resposta sobre sua escolaridade")
    .fill("Concluí o doutorado em 2022.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();

  await expect(page.getByText("Confira o que entendemos", { exact: true })).toBeVisible();
  await expect(page.getByText("Ensino Superior", { exact: true })).toBeVisible();
  await expect(page.getByText("Doutorado", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Concluí essa série/ano", { exact: true })).toBeVisible();
});

test("fluxo guiado superior distingue formação frequentada da concluída", async ({ page, request }) => {
  await openEducation(page, request);
  await page.getByRole("button", { name: "Responder por opções" }).click();
  await page.getByRole("button", { name: "Ensino Superior" }).click();
  await page.getByRole("button", { name: "Não, parei durante essa etapa" }).click();
  await page.getByRole("button", { name: "Mestrado" }).click();
  await expect(page.getByRole("heading", { name: "Antes disso, você concluiu Pós-graduação?" })).toBeVisible();
  await page.getByRole("button", { name: "Ainda não tinha concluído" }).click();
  await page.getByRole("button", { name: "Graduação", exact: true }).click();
  await page.getByLabel("Em que ano isso aconteceu?").fill("2024");

  const educationRequest = page.waitForRequest((pendingRequest) =>
    pendingRequest.url().endsWith("/api/me/education") && pendingRequest.method() === "POST",
  );
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  const payload = (await educationRequest).postDataJSON();

  expect(payload).toMatchObject({
    level: "superior",
    grade: null,
    qualification: "mestrado",
    last_completed_qualification: "graduacao",
    education_status: "stopped",
    completed: false,
  });
  await expect(page).toHaveURL(/\/painel$/);
});

test("graduação iniciada permite registrar nenhuma formação superior concluída", async ({ page, request }) => {
  await openEducation(page, request);
  await page.getByRole("button", { name: "Responder por opções" }).click();
  await page.getByRole("button", { name: "Ensino Superior" }).click();
  await page.getByRole("button", { name: "Ainda estou estudando" }).click();
  await page.getByRole("button", { name: "Graduação", exact: true }).click();
  await expect(page.getByText("Confirmado: Nenhuma formação superior concluída.", { exact: true })).toBeVisible();
  await page.getByLabel("Em que ano começou essa formação?").fill("2025");
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});
