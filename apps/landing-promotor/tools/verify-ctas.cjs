const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  // 1. Test referral param persistence
  console.log('=== REFERRAL PARAMETER PERSISTENCE ===');
  await page.goto('http://localhost:4321/?hub=polo123&utm_source=test&utm_medium=social');
  await page.waitForTimeout(600);
  
  const stored = await page.evaluate(() => ({
    localStorage: localStorage.getItem('pr_attribution'),
    cookie: document.cookie
  }));
  console.log('Stored attribution:', JSON.stringify(stored, null, 2));
  
  const ctaHrefs = await page.$$eval('a[href]', els =>
    els.map(e => e.href).filter(h => h.includes('app.') || h.includes('localhost:3000'))
  );
  console.log('\nCTA hrefs after param capture:');
  ctaHrefs.forEach(h => console.log('  ', h));
  
  // 2. Clean visit (no params)
  console.log('\n=== CLEAN VISIT (no params) ===');
  const page2 = await ctx.newPage();
  await page2.goto('http://localhost:4321/');
  await page2.waitForTimeout(400);
  const cleanHrefs = await page2.$$eval('a[href]', els =>
    els.map(e => e.href).filter(h => h.includes('app.') || h.includes('localhost:3000'))
  );
  console.log('CTA hrefs (clean):', cleanHrefs);
  
  // 3. All internal links
  console.log('\n=== INTERNAL LINK CHECK ===');
  const allLinks = await page2.$$eval('a[href]', els =>
    els.map(e => ({ href: e.href, text: e.textContent.trim().slice(0, 50) }))
      .filter(l => l.href.startsWith('http://localhost:4321'))
  );
  const seen = new Set();
  for (const link of allLinks) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    try {
      const resp = await page2.request.get(link.href);
      console.log(`  [${resp.status()}] ${link.href} — "${link.text}"`);
    } catch (e) {
      console.log(`  [ERR] ${link.href} — ${e.message}`);
    }
  }
  
  // 4. Anchor links (same-page)
  console.log('\n=== ANCHOR LINKS ===');
  const anchors = await page2.$$eval('a[href^="#"]', els =>
    els.map(e => ({ href: e.getAttribute('href'), text: e.textContent.trim().slice(0, 50) }))
  );
  for (const a of anchors) {
    const exists = await page2.$(`[id="${a.href.slice(1)}"]`);
    console.log(`  ${exists ? '✅' : '❌'} ${a.href} — "${a.text}"`);
  }
  
  // 5. External links
  console.log('\n=== EXTERNAL LINKS ===');
  const externals = await page2.$$eval('a[href]', els =>
    els.map(e => ({ href: e.href, text: e.textContent.trim().slice(0, 50) }))
      .filter(l => l.href.startsWith('http') && !l.href.startsWith('http://localhost:4321'))
  );
  for (const l of externals) {
    console.log(`  [ext] ${l.href} — "${l.text}"`);
  }
  
  // 6. Check ref param survives navigation to subpages
  console.log('\n=== PARAM PERSISTENCE ACROSS NAVIGATION ===');
  const page3 = await ctx.newPage();
  await page3.goto('http://localhost:4321/?hub=persist123');
  await page3.waitForTimeout(500);
  await page3.goto('http://localhost:4321/termos');
  await page3.waitForTimeout(300);
  const termosAttrib = await page3.evaluate(() => localStorage.getItem('pr_attribution'));
  console.log('Attribution after navigating to /termos:', termosAttrib);
  
  await browser.close();
  console.log('\n=== ALL CHECKS DONE ===');
})();
