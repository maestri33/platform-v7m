import { test, expect, type Page } from "@playwright/test";

const STUDENT_ME = "**/api/v1/clients/student/me";
const STUDENT_BLOOD = "**/api/v1/clients/student/blood-type";

interface MockStudent {
  status: string;
  blood_type: string | null;
  documents: { type: string; applies: boolean; required: boolean; validation_status: string }[];
}

const MOCK_STUDENT_BASE: MockStudent = {
  status: "awaiting_documents",
  blood_type: null,
  documents: [
    { type: "certificate", applies: true, required: true, validation_status: "not_sent" },
    { type: "transcript", applies: true, required: true, validation_status: "not_sent" },
    { type: "address_proof", applies: true, required: true, validation_status: "not_sent" },
    { type: "id_card", applies: true, required: true, validation_status: "not_sent" },
    { type: "birth_certificate", applies: true, required: false, validation_status: "not_sent" },
    { type: "military", applies: false, required: false, validation_status: "not_applicable" },
  ],
};

async function loginAsStudent(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "supletivo.session",
      JSON.stringify({ phone: "11912345678", externalId: "student-1", roles: ["student"] }),
    );
    window.localStorage.setItem(
      "supletivo.login",
      JSON.stringify({ access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer" }),
    );
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/clients/whoami", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ external_id: "student-1", roles: ["student"], name: "Aluno Teste" }),
    }),
  );
});

test.describe("Portal do Aluno · /aluno", () => {
  test("não autenticado é redirecionado para a home", async ({ page }) => {
    await page.goto("/aluno");
    await expect(page).toHaveURL(/\/$/);
  });

  test("autenticado carrega a lista de documentos e etapas", async ({ page }) => {
    await page.route(STUDENT_ME, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STUDENT_BASE) }),
    );
    await loginAsStudent(page);
    await page.goto("/aluno");

    await expect(page.getByRole("heading", { name: "Envie seus documentos" })).toBeVisible();
    await expect(page.getByText("Certificado de conclusão")).toBeVisible();
    await expect(page.getByText("Histórico escolar")).toBeVisible();
    await expect(page.getByText("Comprovante de endereço")).toBeVisible();
    await expect(page.getByText("RG ou CNH")).toBeVisible();
  });

  test("status exam_released redireciona automaticamente para /provas", async ({ page }) => {
    await page.route(STUDENT_ME, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_STUDENT_BASE, status: "exam_released" }),
      }),
    );
    await loginAsStudent(page);
    await page.goto("/aluno");

    await expect(page).toHaveURL(/\/provas$/, { timeout: 8000 });
  });

  test("documentos aprovados liberam campo de tipo sanguíneo e envio redireciona", async ({ page }) => {
    let currentStudent: MockStudent = {
      ...MOCK_STUDENT_BASE,
      status: "blood_type_pending",
      documents: MOCK_STUDENT_BASE.documents.map((d) =>
        d.required ? { ...d, validation_status: "approved" } : d,
      ),
    };

    await page.route(STUDENT_ME, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(currentStudent) }),
    );
    await page.route(STUDENT_BLOOD, (route) => {
      currentStudent = { ...currentStudent, blood_type: "O+", status: "exam_released" };
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(currentStudent),
      });
    });

    await loginAsStudent(page);
    await page.goto("/aluno");

    await expect(page.getByText("Precisamos pra liberar sua prova.")).toBeVisible();
    const select = page.getByLabel(/Qual seu tipo sanguíneo\?/i);
    await expect(select).toBeEnabled();
    await select.selectOption("O+");

    await page.getByRole("button", { name: /confirmar tipo sanguíneo/i }).click();
    await expect(page).toHaveURL(/\/provas$/, { timeout: 8000 });
  });
});

test.describe("Portal do Aluno · /provas", () => {
  test("não autenticado é redirecionado para a home", async ({ page }) => {
    await page.goto("/provas");
    await expect(page).toHaveURL(/\/$/);
  });

  test("status anterior a prova redireciona de volta para /aluno", async ({ page }) => {
    await page.route(STUDENT_ME, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STUDENT_BASE) }),
    );
    await loginAsStudent(page);
    await page.goto("/provas");

    await expect(page).toHaveURL(/\/aluno$/, { timeout: 8000 });
  });

  test("status exam_released exibe agendamento de prova", async ({ page }) => {
    await page.route(STUDENT_ME, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_STUDENT_BASE, status: "exam_released", blood_type: "A+" }),
      }),
    );
    await loginAsStudent(page);
    await page.goto("/provas");

    await expect(page.getByRole("heading", { name: /Agende sua prova/i })).toBeVisible();
  });
});