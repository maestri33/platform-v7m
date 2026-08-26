export const coordinatorId = "44444444-4444-4444-8444-444444444444";

export async function setupMockEnvironment(page: any, { coordinator = true } = {}) {
  await page.route("**/api/v1/leadership/auth/check", (route: any) =>
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
  await page.route("**/api/v1/leadership/auth/login", (route: any) =>
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
    await page.route(`**/api/v1/leadership/${path}`, (route: any) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }),
    );
  }
}
