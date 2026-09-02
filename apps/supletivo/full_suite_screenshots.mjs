import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = 'c:\\Users\\maestri33\\dev\\v7m\\screenshots\\e2e';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const baseUrl = 'http://localhost:3020';

const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZXMiOlsic3R1ZGVudCJdfQ.mock';

(async () => {
  const browser = await chromium.launch();

  async function capture(name, setupFn) {
    console.log(`[Suite] Capturing ${name}`);
    
    // Mobile
    const mCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const mPage = await mCtx.newPage();
    await setupFn(mPage);
    await mPage.screenshot({ path: path.join(outDir, `supletivo-v2-mobile-${name}.png`), fullPage: false });
    await mCtx.close();

    // Desktop
    const dCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const dPage = await dCtx.newPage();
    await setupFn(dPage);
    await dPage.screenshot({ path: path.join(outDir, `supletivo-v2-desktop-${name}.png`), fullPage: false });
    await dCtx.close();
  }

  // 1. Home Inicial
  await capture('01-home-inicial', async (page) => {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
  });

  // 2. Home Digitando Telefone (Contraste verificado)
  await capture('02-home-digitando', async (page) => {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.locator('#lead-phone').fill('(11) 98765-43');
    await page.waitForTimeout(300);
  });

  // 3. Funil - Login OTP
  await capture('03-funil-login-otp', async (page) => {
    await page.route('**/api/v1/clients/auth/check', async (route) => {
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
    await page.locator('#lead-phone').fill('(11) 98765-4321');
    await page.waitForTimeout(800);
  });

  // 4. Funil - CPF
  await capture('04-funil-cpf', async (page) => {
    await page.route('**/api/v1/clients/auth/check', async (route) => {
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
    await page.locator('#lead-phone').fill('(11) 98765-4321');
    await page.waitForTimeout(800);
  });

  // 5. Funil - Email
  await capture('05-funil-email', async (page) => {
    await page.route('**/api/v1/clients/auth/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: false, stage: 'lead' }),
      });
    });
    await page.route('**/api/v1/clients/lead/identity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cpf: '12345678909',
          name: 'Maria Eduarda Silva',
          birth_date: '1998-05-14',
          photo: null,
        }),
      });
    });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.locator('#lead-phone').fill('(11) 98765-4321');
    await page.waitForTimeout(600);
    const cpf = page.locator('input[inputmode="numeric"]');
    await cpf.fill('12345678909');
    await page.waitForTimeout(600);
  });

  // 6. Funil - Planos
  await capture('06-funil-planos', async (page) => {
    await page.route('**/api/v1/clients/auth/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: false, stage: 'lead' }),
      });
    });
    await page.route('**/api/v1/clients/lead/identity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cpf: '12345678909',
          name: 'Maria Eduarda Silva',
          birth_date: '1998-05-14',
          photo: null,
        }),
      });
    });
    await page.route('**/api/v1/clients/lead/email', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email: 'maria@gmail.com', already_yours: false }),
      });
    });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.locator('#lead-phone').fill('(11) 98765-4321');
    await page.waitForTimeout(500);
    await page.locator('input[inputmode="numeric"]').fill('12345678909');
    await page.waitForTimeout(500);
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('maria.eduarda@gmail.com');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
  });

  // 7. Aluno - Documentos Pendentes
  await capture('07-aluno-docs-pendentes', async (page) => {
    await page.route('**/api/v1/clients/student/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'awaiting_documents',
          name: 'Maria Eduarda Silva',
          documents: [
            { type: 'certificate', name: 'Histórico Escolar do Fundamental', applies: true, required: true, validation_status: 'pending' },
            { type: 'id_card', name: 'Documento com Foto (RG/CNH)', applies: true, required: true, validation_status: 'approved' },
            { type: 'address_proof', name: 'Comprovante de Residência', applies: true, required: true, validation_status: 'pending' },
          ],
          blood_type: null,
        }),
      });
    });
    await page.goto(`${baseUrl}/`);
    await page.evaluate((tok) => {
      window.localStorage.setItem('supletivo.login', JSON.stringify({
        access_token: tok,
        refresh_token: 'mock-refresh',
        roles: ['student'],
      }));
    }, MOCK_TOKEN);
    await page.goto(`${baseUrl}/aluno`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  });

  // 8. Aluno - Tipo Sanguíneo
  await capture('08-aluno-tipo-sanguineo', async (page) => {
    await page.route('**/api/v1/clients/student/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'blood_type_pending',
          name: 'Maria Eduarda Silva',
          documents: [
            { type: 'certificate', name: 'Histórico Escolar', applies: true, required: true, validation_status: 'approved' },
            { type: 'id_card', name: 'RG', applies: true, required: true, validation_status: 'approved' },
            { type: 'address_proof', name: 'Comprovante Residência', applies: true, required: true, validation_status: 'approved' },
          ],
          blood_type: null,
        }),
      });
    });
    await page.goto(`${baseUrl}/`);
    await page.evaluate((tok) => {
      window.localStorage.setItem('supletivo.login', JSON.stringify({
        access_token: tok,
        refresh_token: 'mock-refresh',
        roles: ['student'],
      }));
    }, MOCK_TOKEN);
    await page.goto(`${baseUrl}/aluno`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  });

  // 9. Matrícula - RG Step
  await capture('09-matricula-rg', async (page) => {
    await page.route('**/api/v1/clients/enrollment/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'rg',
          name: 'Maria Eduarda Silva',
        }),
      });
    });
    await page.route('**/api/v1/clients/enrollment/documents/rg', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          number: '',
          issuing_agency: '',
          issue_date: '',
          name: 'Maria Eduarda Silva',
          birth_date: '1998-05-14',
          analysis_status: null,
        }),
      });
    });
    await page.goto(`${baseUrl}/`);
    await page.evaluate((tok) => {
      window.localStorage.setItem('supletivo.login', JSON.stringify({
        access_token: tok,
        refresh_token: 'mock-refresh',
        roles: ['student'],
      }));
    }, MOCK_TOKEN);
    await page.goto(`${baseUrl}/matricula`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  });

  // 10. Matrícula - Endereço Step
  await capture('10-matricula-endereco', async (page) => {
    await page.route('**/api/v1/clients/enrollment/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'address',
          name: 'Maria Eduarda Silva',
          address: {
            cep: '01310-100',
            street: 'Avenida Paulista',
            number: '1000',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
          }
        }),
      });
    });
    await page.goto(`${baseUrl}/`);
    await page.evaluate((tok) => {
      window.localStorage.setItem('supletivo.login', JSON.stringify({
        access_token: tok,
        refresh_token: 'mock-refresh',
        roles: ['student'],
      }));
    }, MOCK_TOKEN);
    await page.goto(`${baseUrl}/matricula`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  });

  // 11. Modal de Sessão Expirada / Checkout
  await capture('11-checkout-sessao-expirada', async (page) => {
    await page.goto(`${baseUrl}/checkout`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
  });

  await browser.close();
  console.log('All full suite screenshots completed!');
})();
