import { test, expect } from "@playwright/test";
import {
  injectCandidateSession,
  injectPromoterSession,
  setupApiMocks,
} from "./helpers/mock-api";

test.describe("Portal Unificado — Onboarding KYC do Promotor", () => {
  test("1. Visão geral das etapas de ativação KYC no hub de onboarding", async ({ page }) => {
    await injectCandidateSession(page);
    await setupApiMocks(page);

    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: /Ativação de Promotor/i })).toBeVisible({
      timeout: 15_000,
    });

    // 5 etapas visíveis
    await expect(page.getByText(/Documento oficial/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Comprovante de residência/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Chave Pix/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Escolaridade/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Selfie & Acordo/i)).toBeVisible({ timeout: 15_000 });
  });

  test("2. Formulário de Documento (RG / CNH)", async ({ page }) => {
    await injectCandidateSession(page);
    await setupApiMocks(page);

    await page.goto("/onboarding/documento");
    await expect(page.getByRole("heading", { name: /Documento/i })).toBeVisible({
      timeout: 15_000,
    });

    // Seleção de tipo de documento
    const cnhBtn = page.getByRole("button", { name: "CNH" });
    await expect(cnhBtn).toBeVisible({ timeout: 15_000 });
    await cnhBtn.click();
    await expect(page.getByText(/Envie a CNH aberta/i)).toBeVisible({ timeout: 15_000 });

    const rgBtn = page.getByRole("button", { name: "RG" });
    await rgBtn.click();
    await expect(page.getByText(/Primeiro envie a FRENTE do RG|Envie foto da frente/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("3. Formulário de Cadastro e Detecção de Chave PIX", async ({ page }) => {
    await injectCandidateSession(page);
    await setupApiMocks(page);

    await page.goto("/onboarding/pix");
    await expect(page.getByRole("heading", { name: /Chave Pix/i })).toBeVisible({
      timeout: 15_000,
    });

    const keyInput = page.getByPlaceholder(/Digite CPF, e-mail, celular/i);
    await keyInput.fill("11999998888");

    await expect(page.getByText(/Celular|Formato Válido/i).first()).toBeVisible({ timeout: 15_000 });

    const submitBtn = page.getByRole("button", { name: /Vincular e Validar Chave PIX/i });
    await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
    await submitBtn.click();

    await expect(page.getByText(/Chave PIX Validada com Sucesso/i)).toBeVisible({ timeout: 15_000 });
  });

  test("4. Formulário de Declaração de Escolaridade", async ({ page }) => {
    await injectCandidateSession(page);
    await setupApiMocks(page);

    await page.goto("/onboarding/escolaridade");
    await expect(page.getByRole("heading", { name: /Nível de Escolaridade/i })).toBeVisible({
      timeout: 15_000,
    });

    // Selecionar Nível e Situação
    await page.getByRole("button", { name: "Ensino Médio" }).click();
    await page.getByRole("button", { name: /Concluído/i }).click();

    const saveBtn = page.getByRole("button", { name: /Salvar e Continuar/i });
    await expect(saveBtn).toBeEnabled({ timeout: 15_000 });
  });

  test("5. Modal de Termo de Parceria e Captura de Selfie", async ({ page }) => {
    await injectCandidateSession(page);
    await setupApiMocks(page);

    await page.goto("/onboarding/selfie");

    // Modal do Termo de Adesão abre primeiro
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Termo de Adesão & Parceria V7M/i)).toBeVisible({ timeout: 15_000 });

    // Aceitar termo
    const acceptBtn = page.getByRole("button", { name: /Li e Concordo/i });
    await acceptBtn.click();

    // Tela de captura de selfie liberada
    await expect(page.getByRole("heading", { name: /Selfie & Assinatura Eletrônica/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /Abrir Câmera Frontal/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
