import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = 'c:\\Users\\maestri33\\dev\\v7m\\screenshots\\e2e';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const baseUrl = 'http://localhost:3020';

(async () => {
  const browser = await chromium.launch();

  // Helper to test in both Mobile and Desktop
  async function testScenario(scenarioName, setupFn) {
    console.log(`Running scenario: ${scenarioName}`);
    
    // Mobile Viewport (iPhone 12 - 390x844)
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const mobilePage = await mobileCtx.newPage();
    await setupFn(mobilePage);
    await mobilePage.screenshot({
      path: path.join(outDir, `v2-mobile-${scenarioName}.png`),
      fullPage: false,
    });
    await mobileCtx.close();

    // Desktop Viewport (1440x900)
    const desktopCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const desktopPage = await desktopCtx.newPage();
    await setupFn(desktopPage);
    await desktopPage.screenshot({
      path: path.join(outDir, `v2-desktop-${scenarioName}.png`),
      fullPage: false,
    });
    await desktopCtx.close();
  }

  // 1. Home - Initial state
  await testScenario('1-home-initial', async (page) => {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  });

  // 2. Home - Typing phone
  await testScenario('2-home-typing', async (page) => {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const input = page.locator('#lead-phone');
    if (await input.count() > 0) {
      await input.fill('(11) 98765-43');
      await page.waitForTimeout(300);
    }
  });

  // 3. Login / OTP screen
  await testScenario('3-funil-login-otp', async (page) => {
    // Intercept API
    await page.route('**/auth/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exists: true,
          external_id: 'user-uuid-1234',
          roles: ['lead'],
          sent: true,
        }),
      });
    });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const input = page.locator('#lead-phone');
    await input.fill('(11) 98765-4321');
    await page.waitForTimeout(1000);
  });

  // 4. Funil CPF screen (New lead)
  await testScenario('4-funil-cpf', async (page) => {
    await page.route('**/auth/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exists: false,
          stage: 'lead',
        }),
      });
    });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const input = page.locator('#lead-phone');
    await input.fill('(11) 98765-4321');
    await page.waitForTimeout(1000);
  });

  // 5. Funil Email screen
  await testScenario('5-funil-email', async (page) => {
    await page.route('**/auth/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: false, stage: 'lead' }),
      });
    });
    await page.route('**/lead/identity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'Maria Eduarda dos Santos',
          birth_date: '1998-05-14',
          photo: null,
        }),
      });
    });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.locator('#lead-phone').fill('(11) 98765-4321');
    await page.waitForTimeout(800);
    const cpfInput = page.locator('input[inputmode="numeric"]');
    if (await cpfInput.count() > 0) {
      await cpfInput.fill('12345678909');
      await page.waitForTimeout(800);
    }
  });

  // 6. Funil Planos screen
  await testScenario('6-funil-planos', async (page) => {
    await page.route('**/auth/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: false, stage: 'lead' }),
      });
    });
    await page.route('**/lead/identity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'Maria Eduarda dos Santos',
          birth_date: '1998-05-14',
          photo: null,
        }),
      });
    });
    await page.route('**/lead/email', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.locator('#lead-phone').fill('(11) 98765-4321');
    await page.waitForTimeout(800);
    const cpfInput = page.locator('input[inputmode="numeric"]');
    if (await cpfInput.count() > 0) {
      await cpfInput.fill('12345678909');
      await page.waitForTimeout(800);
    }
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill('maria.santos@gmail.com');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
  });

  // 7. Student Portal /aluno (Mocking auth & student/me)
  await testScenario('7-aluno-documents-pending', async (page) => {
    await page.route('**/student/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'awaiting_documents',
          name: 'Maria Eduarda dos Santos',
          documents: [
            { type: 'certificate', name: 'Histórico Escolar do Fundamental', applies: true, required: true, validation_status: 'pending' },
            { type: 'id_card', name: 'Documento com Foto (RG/CNH)', applies: true, required: true, validation_status: 'approved' },
            { type: 'address_proof', name: 'Comprovante de Residência', applies: true, required: true, validation_status: 'pending' },
            { type: 'birth_certificate', name: 'Certidão de Nascimento ou Casamento', applies: true, required: false, validation_status: 'pending' },
          ],
          blood_type: null,
        }),
      });
    });
    await page.goto(`${baseUrl}/`);
    await page.evaluate(() => {
      window.localStorage.setItem('supletivo.login', JSON.stringify({
        access_token: 'valid-mock-token',
        refresh_token: 'valid-mock-refresh',
        roles: ['student'],
      }));
    });
    await page.goto(`${baseUrl}/aluno`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  });

  // 8. Student Portal /matricula (Mocking auth & enrollment/me)
  await testScenario('8-matricula-flow', async (page) => {
    await page.route('**/enrollment/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'rg',
          name: 'Maria Eduarda dos Santos',
          rg_extracted: false,
        }),
      });
    });
    await page.goto(`${baseUrl}/`);
    await page.evaluate(() => {
      window.localStorage.setItem('supletivo.login', JSON.stringify({
        access_token: 'valid-mock-token',
        refresh_token: 'valid-mock-refresh',
        roles: ['student'],
      }));
    });
    await page.goto(`${baseUrl}/matricula`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  });

  // 9. Student Portal /provas (Mocking auth & exams)
  await testScenario('9-provas-flow', async (page) => {
    await page.route('**/student/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'exam_released',
          name: 'Maria Eduarda dos Santos',
          documents: [],
          blood_type: 'O+',
        }),
      });
    });
    await page.goto(`${baseUrl}/`);
    await page.evaluate(() => {
      window.localStorage.setItem('supletivo.login', JSON.stringify({
        access_token: 'valid-mock-token',
        refresh_token: 'valid-mock-refresh',
        roles: ['student'],
      }));
    });
    await page.goto(`${baseUrl}/provas`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  });

  // 10. Design System Kit
  await testScenario('10-kit-design-system', async (page) => {
    await page.goto(`${baseUrl}/kit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  });

  await browser.close();
  console.log('All detailed scenarios completed successfully!');
})();
