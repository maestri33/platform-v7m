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
    console.log(`[Capture] ${name}`);
    
    // Mobile (390x844)
    const mCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const mPage = await mCtx.newPage();
    try {
      await setupFn(mPage);
      await mPage.screenshot({ path: path.join(outDir, `supletivo-v2-mobile-${name}.png`), fullPage: false });
    } catch (e) {
      console.error(`Error on mobile ${name}:`, e.message);
    }
    await mCtx.close();

    // Desktop (1440x900)
    const dCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const dPage = await dCtx.newPage();
    try {
      await setupFn(dPage);
      await dPage.screenshot({ path: path.join(outDir, `supletivo-v2-desktop-${name}.png`), fullPage: false });
    } catch (e) {
      console.error(`Error on desktop ${name}:`, e.message);
    }
    await dCtx.close();
  }

  // 1. Home Inicial
  await capture('01-home-inicial', async (page) => {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
  });

  // 2. Home Digitando
  await capture('02-home-digitando', async (page) => {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.locator('#lead-phone').fill('(11) 98765-43');
    await page.waitForTimeout(300);
  });

  // 3. Funil - OTP
  await capture('03-funil-otp', async (page) => {
    await page.route('**/api/v1/clients/auth/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          found: true,
          external_id: 'user-uuid-1234',
          roles: ['lead'],
          otp_sent: true,
          otp_wait: 30,
        }),
      });
    });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.locator('#lead-phone').fill('(11) 98765-4321');
    await page.waitForTimeout(800);
  });

  // 4. Aluno - Documentos Pendentes
  await capture('04-aluno-docs-pendentes', async (page) => {
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
            { type: 'birth_certificate', name: 'Certidão de Nascimento', applies: true, required: false, validation_status: null },
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

  // 5. Aluno - Tipo Sanguíneo
  await capture('05-aluno-tipo-sanguineo', async (page) => {
    await page.route('**/api/v1/clients/student/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'blood_type_pending',
          name: 'Maria Eduarda Silva',
          documents: [
            { type: 'certificate', name: 'Histórico Escolar', applies: true, required: true, validation_status: 'approved' },
            { type: 'id_card', name: 'RG / CNH', applies: true, required: true, validation_status: 'approved' },
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

  // 6. Matrícula - RG
  await capture('06-matricula-rg', async (page) => {
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
          number: '12.345.678-9',
          issuing_agency: 'SSP/SP',
          issue_date: '2018-05-10',
          name: 'Maria Eduarda Silva',
          birth_date: '1998-05-14',
          mother_name: 'Ana Maria Silva',
          father_name: 'José Carlos Silva',
          birthplace: 'São Paulo - SP',
          marital_status: 'solteiro',
          nationality: 'Brasileira',
          analysis_status: 'approved',
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

  // 7. Modal de Sessão Expirada / Checkout
  await capture('07-checkout-sessao-expirada', async (page) => {
    await page.goto(`${baseUrl}/checkout`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
  });

  // 8. Design System Kit
  await capture('08-kit-design-system', async (page) => {
    await page.goto(`${baseUrl}/kit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
  });

  await browser.close();
  console.log('All final screenshots generated successfully!');
})();
