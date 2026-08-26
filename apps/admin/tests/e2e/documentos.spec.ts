import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/full_audit.plan.md (Seção 3.7)
// seed: tests/e2e/seed.spec.ts

test.describe("10. Auditoria e Validação de Documentos", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("10.1 Listagem de Fila de Documentos e Filtros de Categoria", async ({ page }) => {
    await page.goto("/documentos");

    // Valida Header da Mesa
    await expect(
      page.getByRole("heading", { name: "Mesa de Conferência de Documentos & Biometria" }),
    ).toBeVisible({ timeout: 15_000 });

    // Valida botões de filtro de categoria
    await expect(page.getByRole("button", { name: /Todos/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Documentos RG\/CNH/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Selfies Biométricas/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Matrículas/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Candidatos/i })).toBeVisible();

    // Valida item retido na fila
    await expect(page.getByText("(11) 98888-7777")).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir Mesa Dual-View" })).toBeVisible();
  });

  test("10.2 Abertura da Mesa Dual-View e Controles de Imagem", async ({ page }) => {
    await page.goto("/documentos");

    // Clica para abrir a Mesa Dual-View
    await page.getByRole("button", { name: "Abrir Mesa Dual-View" }).click();

    // Valida modal de Dossiê aberto
    await expect(page.getByRole("heading", { name: /Mesa de Conferência Documental:/ })).toBeVisible();

    // Valida abas de fotos do documento
    await expect(page.getByRole("button", { name: "Doc Frente" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Doc Verso" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Selfie ao Vivo" })).toBeVisible();

    // Valida controles de Pan/Zoom e Rotação
    await expect(page.getByRole("button", { name: "+ Zoom" })).toBeVisible();
    await expect(page.getByRole("button", { name: "- Zoom" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
    await expect(page.getByRole("button", { name: "↻ Girar 90°" })).toBeVisible();

    // Testa zoom
    await page.getByRole("button", { name: "+ Zoom" }).click();
    await expect(page.getByText("125%")).toBeVisible();

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("100%")).toBeVisible();

    // Valida botões de decisão
    await expect(page.getByRole("button", { name: /Aprovar RG/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Aprovar Selfie/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Reprovar/ })).toBeVisible();
  });

  test("10.3 Atalhos de Teclado (Hotkeys) na Mesa de Decisão", async ({ page }) => {
    await page.goto("/documentos");

    // Abre a Mesa Dual-View
    await page.getByRole("button", { name: "Abrir Mesa Dual-View" }).click();
    await expect(page.getByRole("heading", { name: /Mesa de Conferência Documental:/ })).toBeVisible();

    // Pressiona tecla 'A' para aprovação rápida de RG
    await page.keyboard.press("a");

    // Valida que o documento foi processado e o modal fechou
    await expect(page.getByRole("heading", { name: /Mesa de Conferência Documental:/ })).not.toBeVisible();
  });
});
