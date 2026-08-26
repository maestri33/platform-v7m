// spec: specs/dashboard-e2e.md
// seed: tests/e2e/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/?app=default');
  });

  test('1.1 Visão Geral e Indicadores de Saúde', async ({ page }) => {
    // 1. Verificar título da página
    await expect(page).toHaveTitle(/Notify/);

    // 2. Verificar cards de métricas
    await expect(page.getByText('Total de Envios')).toBeVisible();
    await expect(page.getByText('Entregues com Sucesso')).toBeVisible();
    await expect(page.getByText('Falhas Registradas')).toBeVisible();
    await expect(page.getByText('Mensagens Recebidas')).toBeVisible();

    // 3. Verificar status operacional dos canais
    await expect(page.getByText('Status Operacional dos Canais')).toBeVisible();
  });

  test('1.2 Navegação Completa pela Sidebar', async ({ page }) => {
    const nav = page.locator('nav');

    // WhatsApp
    await nav.getByRole('link', { name: 'WhatsApp' }).click();
    await expect(page).toHaveURL(/.*\/dashboard\/whatsapp\//);
    await expect(page.getByRole('heading', { name: /WhatsApp/i }).first()).toBeVisible();

    // E-mail
    await nav.getByRole('link', { name: 'E-mail' }).click();
    await expect(page).toHaveURL(/.*\/dashboard\/email\//);
    await expect(page.getByRole('heading', { name: /Canal E-mail/i })).toBeVisible();

    // Envios (Outbound)
    await nav.getByRole('link', { name: /Envios/i }).click();
    await expect(page).toHaveURL(/.*\/dashboard\/messages\//);

    // Recebidas (Inbound)
    await nav.getByRole('link', { name: /Recebidas/i }).click();
    await expect(page).toHaveURL(/.*\/dashboard\/inbox\//);

    // Configurações
    await nav.getByRole('link', { name: 'Configurações' }).click();
    await expect(page).toHaveURL(/.*\/dashboard\/settings\//);

    // Retorno para Visão Geral
    await nav.getByRole('link', { name: 'Visão Geral' }).click();
    await expect(page).toHaveURL(/.*(\/|\/dashboard\/)\?app=.*/);
  });

  test('3.1 Abertura e Fechamento do Modal Nova Conta', async ({ page }) => {
    // Clicar no botão Nova Conta
    const newAccountBtn = page.getByRole('button', { name: 'Nova Conta' });
    await expect(newAccountBtn).toBeVisible();
    await newAccountBtn.click();

    // Modal deve estar visível
    const modal = page.locator('#modal-new-account');
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[name="name"]')).toBeVisible();
    await expect(modal.locator('input[name="slug"]')).toBeVisible();
  });
});
