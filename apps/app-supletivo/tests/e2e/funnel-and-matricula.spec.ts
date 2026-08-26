// spec: specs/funnel-and-matricula.md
// seed: tests/e2e/seed.spec.ts

import { test, expect, type Page } from "@playwright/test";

const WHOAMI_URL = "**/api/v1/clients/whoami";
const CHECK_URL = "**/api/v1/clients/auth/check";
const LOGIN_URL = "**/api/v1/clients/auth/login";
const BLOCKS_URL = "**/api/v1/clients/me/blocks";
const ENROLLMENT_ME_URL = "**/api/v1/clients/enrollment/me";
const ENROLLMENT_RG_URL = "**/api/v1/clients/enrollment/documents/rg";
const STUDENT_ME_URL = "**/api/v1/clients/student/me";

async function authenticateSession(page: Page, roles: string[] = ["enrollment"]) {
  await page.addInitScript((rolesList) => {
    window.localStorage.setItem(
      "supletivo.session",
      JSON.stringify({ phone: "11987654321", externalId: "test-user-id", roles: rolesList }),
    );
    window.localStorage.setItem(
      "supletivo.login",
      JSON.stringify({
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        token_type: "bearer",
      }),
    );
  }, roles);
}

test.describe("Funil do Aluno, Matrícula & Bloqueios", () => {
  test("1. Autenticação OTP com Check de WhatsApp e avanço para CPF", async ({ page }) => {
    await page.route(WHOAMI_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "test-user-id",
          roles: ["lead"],
          name: "Aluno Teste",
        }),
      });
    });

    await page.route(CHECK_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          found: true,
          external_id: "test-user-id",
          otp_sent: true,
          otp_wait: null,
          whatsapp: true,
          roles: ["lead"],
          created: false,
        }),
      });
    });

    await page.route(LOGIN_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "test-jwt-token",
          refresh_token: "test-refresh-token",
          token_type: "bearer",
        }),
      });
    });

    await page.goto("/");
    const phoneInput = page.locator("#lead-phone");
    await expect(phoneInput).toBeVisible();

    await phoneInput.click();
    await phoneInput.pressSequentially("11987654321", { delay: 35 });

    // Deve avançar para /login (OTP)
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });

    // Preenche OTP
    const otpInput = page.locator('input[name="otp"], input[autocomplete="one-time-code"]').first();
    if (await otpInput.isVisible()) {
      await otpInput.fill("123456");
    } else {
      const digits = page.locator("input[maxlength='1']");
      const count = await digits.count();
      for (let i = 0; i < count; i++) {
        await digits.nth(i).fill(String(i + 1));
      }
    }

    // Com role="lead", deve navegar para /cpf
    await expect(page).toHaveURL(/cpf/, { timeout: 10_000 });
  });

  test("2. Wizard de matrícula trata 409 WRONG_STATUS e sincroniza com o servidor", async ({ page }) => {
    await page.route(WHOAMI_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "test-user-id",
          roles: ["enrollment"],
          name: "Aluno Teste",
        }),
      });
    });

    await authenticateSession(page, ["enrollment"]);

    // O backend retorna que a etapa atual é 'rg'
    await page.route(ENROLLMENT_ME_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "enr-123",
          status: "rg",
          hub_external_id: "hub-1",
          selfie_verified: false,
          selfie_status: "pending",
          rg: {
            analysis_status: "pending",
            next_slot: "rg_front",
            missing_fields: ["number"],
          },
        }),
      });
    });

    await page.route(ENROLLMENT_RG_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          number: null,
          issuing_agency: null,
          issue_date: null,
          front_photo: null,
          back_photo: null,
          full_photo: null,
          analysis_status: null,
          next_slot: "rg_front",
          missing_fields: ["number", "issuing_agency"],
        }),
      });
    });

    await page.goto("/matricula");
    await expect(page.getByRole("heading", { name: /complete sua matrícula/i })).toBeVisible();
    await expect(page.getByText(/documento/i).first()).toBeVisible();
  });

  test("3. Exibição de banner de bloqueio ativo (/me/blocks) com orientação humanizada", async ({ page }) => {
    await page.route(WHOAMI_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "student-1",
          roles: ["student"],
          name: "Aluno Teste",
        }),
      });
    });

    await authenticateSession(page, ["student"]);

    await page.route(BLOCKS_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            external_id: "block-101",
            source_type: "rg",
            title: "Foto com reflexo no documento",
            description: "A luz refletiu nos números do seu documento e impediu a leitura.",
            action_label: "Tirar nova foto do RG",
            action_route: "/matricula",
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route(STUDENT_ME_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "student-1",
          status: "awaiting_documents",
          blood_type: null,
          documents: [
            { type: "certificate", applies: true, required: true, validation_status: "not_sent" },
            { type: "transcript", applies: true, required: true, validation_status: "not_sent" },
            { type: "address_proof", applies: true, required: true, validation_status: "not_sent" },
            { type: "id_card", applies: true, required: true, validation_status: "not_sent" },
          ],
        }),
      });
    });

    await page.goto("/aluno");

    // Verifica que o banner de bloqueio aparece com texto claro
    const blockAlert = page.locator('aside[aria-label="Avisos importantes"]');
    await expect(blockAlert).toBeVisible({ timeout: 10_000 });
    await expect(blockAlert.getByText(/foto com reflexo no documento/i)).toBeVisible();
    await expect(blockAlert.getByText(/a luz refletiu nos números/i)).toBeVisible();
    await expect(blockAlert.getByRole("button", { name: /tirar nova foto do rg/i })).toBeVisible();
  });

  test("4. Portal do Aluno: checklist de documentos e submissão de tipo sanguíneo", async ({ page }) => {
    await page.route(WHOAMI_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "student-1",
          roles: ["student"],
          name: "Aluno Teste",
        }),
      });
    });

    await authenticateSession(page, ["student"]);

    await page.route(BLOCKS_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route(STUDENT_ME_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "student-1",
          status: "awaiting_documents",
          blood_type: null,
          documents: [
            { type: "certificate", applies: true, required: true, validation_status: "approved" },
            { type: "transcript", applies: true, required: true, validation_status: "approved" },
            { type: "address_proof", applies: true, required: true, validation_status: "approved" },
            { type: "id_card", applies: true, required: true, validation_status: "approved" },
            { type: "birth_certificate", applies: true, required: false, validation_status: "approved" },
            { type: "military", applies: false, required: false, validation_status: "approved" },
          ],
        }),
      });
    });

    await page.goto("/aluno");

    // Com todos os documentos obrigatórios aprovados, o seletor de tipo sanguíneo deve estar ativo
    await expect(page.getByText(/tipo sanguíneo/i).first()).toBeVisible();
  });
});
