import { expect, test } from "@playwright/test";

const coordinatorId = "44444444-4444-4444-8444-444444444444";

async function mockPortal(page, { coordinator = true } = {}) {
  await page.route("**/api/v1/leadership/auth/check", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        found: true,
        external_id: coordinatorId,
        otp_sent: true,
        otp_wait: 0,
        is_coordinator: coordinator,
        detail: coordinator ? null : "Este acesso é exclusivo para coordenadores.",
        hub: coordinator ? { external_id: "hub-e2e", brand: "Polo Teste" } : null,
      }),
    }),
  );
  await page.route("**/api/v1/leadership/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "hub-e2e-access",
        refresh_token: "hub-e2e-refresh",
        token_type: "bearer",
      }),
    }),
  );
  const data = {
    leads: [{ external_id: "lead-1", name: "Lead Teste", status: "pending" }],
    enrollments: [{ external_id: "enr-1", name: "Matrícula Teste", status: "awaiting_release" }],
    reviews: {
      enrollment_rg: [{ external_id: "enr-1", name: "Revisão RG", type: "enrollment", kind: "rg", since: "2026-08-20T10:00:00Z" }],
      locked_promoters: [{ external_id: "promoter-locked", name: "Promotor Travado", type: "promoter", kind: "locked_training", pending_materials: [{ external_id: "mat-1" }] }],
    },
    students: { items: [{ external_id: "student-1", name: "Aluno Teste", status: "exam_released" }], total: 1 },
    candidates: [{ external_id: "candidate-1", name: "Candidato Teste", status: "awaiting_approval", since: "2026-08-20T10:00:00Z" }],
    promoters: [
      { external_id: "promoter-1", name: "Promotor Teste", status: "active", locked: false },
      { external_id: "promoter-locked", name: "Promotor Travado", status: "active", locked: true },
    ],
  };
  for (const [path, body] of Object.entries(data)) {
    await page.route(`**/api/v1/leadership/${path}`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }),
    );
  }
}

test("coordenador entra por OTP e enxerga as filas do polo", async ({ page }) => {
  await mockPortal(page);
  await page.goto("/");
  await page.getByLabel("Telefone/WhatsApp").fill("(11) 95555-5555");
  await page.getByRole("button", { name: "Enviar código" }).click();
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Entrar no polo" }).click();

  await expect(page.getByRole("heading", { name: "Visão geral do polo" })).toBeVisible();
  await expect(page.locator("#hub-brand")).toContainText("Polo Teste");
  await expect(page.locator("#stats")).toContainText("Revisões");
  await expect(page.locator("#reviews-preview")).toContainText("Revisão RG");
});

test("coordenador aprova candidato pela API real do contrato", async ({ page }) => {
  await mockPortal(page);
  let actionBody = "not-called";
  await page.route("**/api/v1/leadership/candidates/candidate-1/approve", async (route) => {
    actionBody = route.request().postData() || "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ external_id: "candidate-1", status: "approved" }),
    });
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/");
  await page.getByLabel("Telefone/WhatsApp").fill("(11) 95555-5555");
  await page.getByRole("button", { name: "Enviar código" }).click();
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Entrar no polo" }).click();
  await expect(page.getByRole("heading", { name: "Visão geral do polo" })).toBeVisible();

  await page.locator("#nav-equipe").click();
  await expect(page.getByRole("heading", { name: "Equipe do Polo" })).toBeVisible();
  await page.getByRole("button", { name: "Aprovar" }).first().click();

  await expect(page.getByRole("status")).toContainText("Operação concluída");
  expect(actionBody).toBe("");
});

test("perfil que não coordena polo é bloqueado antes do OTP", async ({ page }) => {
  await mockPortal(page, { coordinator: false });
  await page.goto("/");
  await page.getByLabel("Telefone/WhatsApp").fill("(11) 94444-4444");
  await page.getByRole("button", { name: "Enviar código" }).click();
  await expect(page.getByText("Este acesso é exclusivo para coordenadores.")).toBeVisible();
  await expect(page.locator("#otp-form")).toBeHidden();
});

test("coordenador destrava matéria de treino de promotor na Central de Revisões", async ({ page }) => {
  await mockPortal(page);
  let unlocked = false;
  await page.route("**/api/v1/leadership/promoters/promoter-locked/materials/mat-1/approve", async (route) => {
    unlocked = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ promoter_external_id: "promoter-locked", material_external_id: "mat-1", locked: false }),
    });
  });

  await page.goto("/");
  await page.getByLabel("Telefone/WhatsApp").fill("(11) 95555-5555");
  await page.getByRole("button", { name: "Enviar código" }).click();
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Entrar no polo" }).click();
  await expect(page.getByRole("heading", { name: "Visão geral do polo" })).toBeVisible();

  await page.locator("#nav-inbox").click();
  await expect(page.getByRole("heading", { name: "Central de Análises & Revisões" })).toBeVisible();
  await page.getByRole("button", { name: "Destravar Treino" }).first().click();
  await page.getByRole("button", { name: "Confirmar" }).click();

  await expect(page.getByText("Matéria de treino aprovada e promotor destravado!")).toBeVisible();
  expect(unlocked).toBe(true);
});
