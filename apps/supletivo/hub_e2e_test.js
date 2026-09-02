const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const targetUrl = 'http://localhost:3004';
const outputDir = 'c:\\Users\\maestri33\\dev\\v7m\\screenshots\\e2e';

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function runTest(viewport, suffix) {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    // Mock API requests to bypass login
    await page.route('**/auth/check', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ found: true, is_coordinator: true, external_id: "123", otp_wait: 0, hub: { brand: "Test Hub" } })
    }));
    await page.route('**/auth/login', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: "fake-token", refresh_token: "fake-refresh" })
    }));
    await page.route('**/leads', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/enrollments', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/reviews', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/students', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/candidates', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/promoters', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

    // Test phone mask on login
    await page.goto(`${targetUrl}/`);
    await page.waitForTimeout(500);
    try {
        const phoneInput = await page.$('#phone');
        if (phoneInput) {
            await phoneInput.type('11999999999');
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(outputDir, `hub-login-mask-${suffix}.png`), fullPage: true });
            
            // Proceed to login
            await page.click('button[type="submit"]');
            await page.waitForTimeout(500);
            await page.fill('#otp', '123456');
            await page.click('#otp-form button[type="submit"]');
            await page.waitForTimeout(1000); // Wait for login and load
        }
    } catch (e) {
        console.log(`Error testing phone mask on ${suffix}:`, e.message);
    }

    const routes = [
        { name: 'dashboard', hash: '' },
        { name: 'reviews', hash: '#reviews' },
        { name: 'students', hash: '#students' },
        { name: 'team', hash: '#team' },
        { name: 'invalid', hash: '#xyz' },
    ];

    for (const route of routes) {
        await page.goto(`${targetUrl}/${route.hash}`);
        await page.waitForTimeout(1000); // Wait for rendering
        await page.screenshot({ path: path.join(outputDir, `hub-${route.name}-${suffix}.png`), fullPage: true });
    }

    await browser.close();
}

async function main() {
    console.log('Running mobile tests...');
    await runTest({ width: 390, height: 844 }, 'mobile');
    console.log('Running desktop tests...');
    await runTest({ width: 1440, height: 900 }, 'desktop');
    console.log('Done.');
}

main().catch(console.error);
