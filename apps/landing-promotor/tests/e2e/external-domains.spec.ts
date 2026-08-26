import { test, expect } from '@playwright/test';

test.describe('Validação E2E da Malha de Domínios Externos V7M', () => {

  test('1. Landing Promotor (maestri.group / Edge)', async ({ page, request }) => {
    // 1.1 HTTP Request Status
    const res = await request.get('https://landing-promotor.pages.dev');
    expect(res.status()).toBe(200);

    // 1.2 Browser Render
    await page.goto('https://landing-promotor.pages.dev', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Maestri|Promotor|V7M/i);
    
    // 1.3 Validar ausência total de job.v7m.org
    const content = await page.content();
    expect(content).not.toContain('job.v7m.org');
    
    // 1.4 Validar CTA para o app do promotor
    const cta = page.locator('a[href*="app.maestri.group"]');
    await expect(cta.first()).toBeVisible();
  });

  test('2. Landing Supletivo (supletivo.net.br / Edge)', async ({ page, request }) => {
    // 2.1 HTTP Request Status
    const res = await request.get('https://landing-supletivo.pages.dev');
    expect(res.status()).toBe(200);

    // 2.2 Browser Render
    await page.goto('https://landing-supletivo.pages.dev', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Supletivo|EJA|Certificado/i);
    
    // 2.3 Validar ausência total de job.v7m.org
    const content = await page.content();
    expect(content).not.toContain('job.v7m.org');
  });

  test('3. Portal do Aluno (app.supletivo.net.br / Next.js CT 150)', async ({ request }) => {
    const res = await request.get('http://51.79.77.31/', {
      headers: { Host: 'app.supletivo.net.br' }
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Supletivo|Matrícula/i);
  });

  test('4. Portal do Promotor (app.maestri.group / Next.js CT 150)', async ({ request }) => {
    const res = await request.get('http://51.79.77.31/', {
      headers: { Host: 'app.maestri.group' }
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Promotor|V7M|Maestri|Entrar/i);
  });

  test('5. Hub Polos & Liderança (hub.maestri.group / Next.js CT 150)', async ({ request }) => {
    const res = await request.get('http://51.79.77.31/', {
      headers: { Host: 'hub.maestri.group' }
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.length).toBeGreaterThan(100);
  });

  test('6. Admin Geral Staff (admin.maestri.group / Next.js CT 150)', async ({ request }) => {
    const res = await request.get('http://51.79.77.31/', {
      headers: { Host: 'admin.maestri.group' }
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.length).toBeGreaterThan(100);
  });

  test('7. API Django Ninja Contextual (api.supletivo.net.br & api.maestri.group)', async ({ request }) => {
    const resSupletivo = await request.get('http://51.79.77.31/api/v1/health/healthz', {
      headers: { Host: 'api.supletivo.net.br' }
    });
    expect(resSupletivo.status()).toBe(200);
    const dataSupletivo = await resSupletivo.json();
    expect(dataSupletivo.status).toBe('ok');
    expect(dataSupletivo.db).toBe(true);

    const resMaestri = await request.get('http://51.79.77.31/api/v1/health/healthz', {
      headers: { Host: 'api.maestri.group' }
    });
    expect(resMaestri.status()).toBe(200);
    const dataMaestri = await resMaestri.json();
    expect(dataMaestri.status).toBe('ok');
    expect(dataMaestri.db).toBe(true);
  });

  test('8. Stalwart Mail & Webmail (mail.maestri.group / webmail.maestri.group)', async ({ request }) => {
    const resMail = await request.get('http://51.79.77.31/', {
      headers: { Host: 'mail.maestri.group' },
      maxRedirects: 0
    });
    expect([200, 301, 302, 307, 308]).toContain(resMail.status());

    const resWebmail = await request.get('http://51.79.77.31/', {
      headers: { Host: 'webmail.maestri.group' },
      maxRedirects: 0
    });
    expect([200, 301, 302, 307, 308]).toContain(resWebmail.status());
  });

});