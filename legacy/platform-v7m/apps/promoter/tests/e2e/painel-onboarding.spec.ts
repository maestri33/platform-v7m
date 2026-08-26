import { expect, test } from "@playwright/test";

/**
 * Novo fluxo "tudo-async-até-receber".
 *
 * Cobertura:
 *  - candidato onboarding (5 etapas pendentes) cai no /painel direto após auth
 *  - painel exibe o alerta de hold âmbar, a grade com 5 tiles "Pendente" e
 *    o link de captação
 *  - candidato pode visitar /documento a partir do tile e voltar pro /painel
 *    (sem redirect forçado pra próxima etapa)
 *  - candidato onboarding completo (após simular) vê alerta azul
 *    "aguardando polo" e 5 tiles em ✓
 *
 * Usa o endpoint novo `/me` (controlado por `__stage?newMe=1`) para validar
 * o caminho "back-deployado". O fallback p/ os 3 endpoints legados é
 * exercitado pelos outros specs.
 */
const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";

test.beforeEach(async ({ request }) => {
  await request.post(`${mockBackend}/__reset`);
  // Liga o novo /me neste teste.
  await request.post(`${mockBackend}/__stage?newMe=1`);
});

async function login(
  page: import("@playwright/test").Page,
  documentGate: "dismiss" | "keep" | "none" = "dismiss",
) {
  await page.goto("/");
  await page.getByLabel(/^CPF$/i).fill("52998224725");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByLabel(/C[oó]digo de 6 d[ií]gitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();

  const gate = page.getByRole("dialog", { name: /Envie seu RG ou CNH/i });
  if (documentGate === "none") {
    await expect(gate).toHaveCount(0);
  } else {
    await expect(gate).toBeVisible();
    if (documentGate === "dismiss") {
      await gate.getByRole("button", { name: /Continuar no painel/i }).click();
      await expect(gate).not.toBeVisible();
    }
  }

  if (documentGate !== "keep") {
    await expect(page.getByText("Seu link", { exact: true })).toBeVisible();
  }
}

test("candidato onboarding cai direto no /painel (sem wizard forçado)", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/painel$/);
});

test("documento pendente abre modal com upload sem esconder o acesso ao painel", async ({ page }) => {
  await login(page, "keep");

  const gate = page.getByRole("dialog", { name: /Envie seu RG ou CNH/i });
  await expect(gate.getByText(/dashboard e seu link de indicação já estão liberados/i)).toBeVisible();
  await gate.getByLabel("RG").check();
  await expect(gate.getByRole("button", { name: /Tirar foto/i })).toBeEnabled();
  await expect(gate.getByRole("button", { name: /Enviar arquivo/i })).toBeEnabled();
});

test("painel exibe alerta âmbar + grade de 5 tiles + link de captação", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/painel$/);

  // Alerta de hold: "Para você receber, falta(m) 5 etapa(s)".
  // (Filtra o announcer do Next.js — todo <div role="alert"> global — p/
  // mirar especificamente o banner do painel.)
  const holdAlert = page
    .getByRole("alert")
    .filter({ hasText: /Para voc[êe] receber/ });
  await expect(holdAlert).toBeVisible();
  await expect(holdAlert).toContainText(/5 etapas/);

  // Grade de 5 tiles: 4 "pendente" + 1 "em análise" (a selfie do mock
  // começa com analysis_status=pending, então renderiza como "em análise"
  // — não como "pendente" simples).
  const pendingTiles = page.getByRole("link", { name: /Pendente/i });
  await expect(pendingTiles).toHaveCount(4);
  const reviewTiles = page.getByRole("link", { name: /em an[áa]lise/i });
  await expect(reviewTiles).toHaveCount(1);
  // Total: 5 tiles com href em /documento | /endereco | /pix | /escolaridade | /selfie
  await expect(page.getByRole("link", { name: /RG ou CNH/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Comprovante/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Chave Pix/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Escolaridade/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Selfie/i })).toBeVisible();

  // Link de captação.
  await expect(page.getByText("Seu link", { exact: true })).toBeVisible();
  await expect(page.getByText("https://job.v7m.org/?ref=e2e")).toBeVisible();

  // Bottom-nav reduzida a 2 abas no modo candidato.
  await expect(page.getByRole("navigation", { name: /navega[çc][ãa]o principal/i }))
    .toBeVisible();
  await expect(page.getByRole("link", { name: /^In[íi]cio$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Conta$/ })).toBeVisible();
  // E NÃO tem a aba de Leads/Comissões (elas só aparecem para promoter pleno).
  await expect(page.getByRole("link", { name: /^Leads$/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Comiss[õo]es$/ })).toHaveCount(0);
});

test("candidato pode abrir Documento pelo tile e volta pro /painel (sem auto-avançar)", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/painel$/);

  // Clica no tile "RG ou CNH" → vai pra /documento.
  await page.getByRole("link", { name: /RG ou CNH/i }).first().click();
  await expect(page).toHaveURL(/\/documento$/);

  // Volta pro /painel pelo header (logo V7M).
  await page.getByRole("link", { name: /V7M/i }).first().click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("após onboarding completo, painel mostra alerta azul sem trava documental", async ({ page, request }) => {
  // Simula onboarding 100% completo (preenche todos os blocos que o /me checa).
  await request.post(`${mockBackend}/__onboarding-complete`);
  // Re-liga o /me (o /__reset no beforeEach zera; o /__onboarding-complete
  // mantém useNewMe como está — religamos p/ garantir).
  await request.post(`${mockBackend}/__stage?newMe=1`);

  await login(page, "none");
  await expect(page).toHaveURL(/\/painel$/);

  // Alerta muda: agora é "azul" (status, não alert) — texto "análise do polo em andamento".
  const poloBanner = page
    .getByRole("status")
    .filter({ hasText: /an[áa]lise do polo em andamento/i });
  await expect(poloBanner).toBeVisible();

  // O dashboard concluído fica limpo: sem modal e sem grade de pendências.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Pendente/i })).toHaveCount(0);
});
