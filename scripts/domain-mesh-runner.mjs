import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';

const DOMAINS_CONFIG = [
  { name: 'Landing Promotor (Apex)', domain: 'maestri.group', path: '/', target: 'pages', expectedStatus: [200] },
  { name: 'Landing Promotor (WWW)', domain: 'www.maestri.group', path: '/', target: 'pages', expectedStatus: [200, 301, 308] },
  { name: 'Landing Supletivo (Apex)', domain: 'supletivo.net.br', path: '/', target: 'pages', expectedStatus: [200] },
  { name: 'Landing Supletivo (WWW)', domain: 'www.supletivo.net.br', path: '/', target: 'pages', expectedStatus: [200, 301, 308] },
  { name: 'App Promotor', domain: 'app.maestri.group', path: '/', target: 'app', port: 3001, expectedStatus: [200] },
  { name: 'Hub Regional', domain: 'hub.maestri.group', path: '/', target: 'app', port: 3004, expectedStatus: [200] },
  { name: 'Admin Cockpit', domain: 'admin.maestri.group', path: '/', target: 'app', port: 3003, expectedStatus: [200] },
  { name: 'Backend API Health', domain: 'api.maestri.group', path: '/api/v1/health/healthz', target: 'api', port: 8001, expectedStatus: [200], jsonCheck: true },
  { name: 'App Supletivo (Aluno)', domain: 'app.supletivo.net.br', path: '/', target: 'app', port: 3020, expectedStatus: [200] },
  { name: 'API Supletivo Health', domain: 'api.supletivo.net.br', path: '/api/v1/health/healthz', target: 'api', port: 8001, expectedStatus: [200], jsonCheck: true },
  { name: 'Stalwart Mail Server', domain: 'mail.maestri.group', path: '/', target: 'mail', port: 8080, expectedStatus: [200, 301, 302, 307] },
  { name: 'Bulwark Webmail', domain: 'webmail.maestri.group', path: '/', target: 'webmail', port: 3000, expectedStatus: [200, 301, 302, 307] }
];

const args = process.argv.slice(2);
const originIp = args.includes('--origin') ? args[args.indexOf('--origin') + 1] || '51.79.77.31' : null;
const isOriginMode = Boolean(originIp);

console.log('🌐 V7M Ecosystem — Domain Mesh & Origin Connectivity Runner');
console.log('Mode: ' + (isOriginMode ? 'DIRECT ORIGIN PROBE (' + originIp + ')' : 'PUBLIC CLOUDFLARE EDGE'));
console.log('================================================================');

const publicResolver = new dns.Resolver();
publicResolver.setServers(['1.1.1.1', '8.8.8.8']);

async function testPublic(item) {
  const url = 'https://' + item.domain + item.path;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal, redirect: 'manual' });
    clearTimeout(timeout);
    
    let jsonOk = true;
    if (item.jsonCheck && res.status === 200) {
      try {
        const body = await res.json();
        jsonOk = body && body.status === 'ok';
      } catch {
        jsonOk = false;
      }
    }

    const isExpected = item.expectedStatus.includes(res.status) && jsonOk;
    return {
      success: isExpected,
      status: res.status,
      server: res.headers.get('server') || 'unknown',
      location: res.headers.get('location') || '',
      error: isExpected ? null : (res.status === 522 ? 'Cloudflare 522 (Origin Timeout)' : ('HTTP ' + res.status))
    };
  } catch (err) {
    // Fallback: If local OS DNS cache is poisoned/stale, test via public DNS resolver directly with SNI
    try {
      const ips = await publicResolver.resolve4(item.domain).catch(() => []);
      if (ips.length > 0) {
        return await new Promise((resolve) => {
          const req = https.request({
            host: ips[0],
            port: 443,
            path: item.path,
            method: 'GET',
            headers: {
              'Host': item.domain,
              'User-Agent': 'V7M-Domain-Mesh-Runner/1.0'
            },
            servername: item.domain,
            timeout: 6000
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              let jsonOk = true;
              if (item.jsonCheck && res.statusCode === 200) {
                try {
                  const body = JSON.parse(data);
                  jsonOk = body && body.status === 'ok';
                } catch {
                  jsonOk = false;
                }
              }
              const isExpected = item.expectedStatus.includes(res.statusCode) && jsonOk;
              resolve({
                success: isExpected,
                status: res.statusCode,
                server: res.headers.server || 'unknown',
                location: res.headers.location || '',
                error: isExpected ? null : ('HTTP ' + res.statusCode)
              });
            });
          });
          req.on('error', (e) => resolve({ success: false, status: 0, server: 'none', error: e.message }));
          req.on('timeout', () => { req.destroy(); resolve({ success: false, status: 0, server: 'none', error: 'Timeout 6s' }); });
          req.end();
        });
      }
    } catch {
      // Fallthrough to original error
    }

    return {
      success: false,
      status: 0,
      server: 'none',
      location: '',
      error: err.name === 'AbortError' ? 'Timeout 6s' : err.message
    };
  }
}

async function testOrigin(item, hostIp) {
  if (item.target === 'pages') {
    return { success: true, status: 200, server: 'cloudflare-pages (edge-only)', error: null, skipped: true };
  }

  return new Promise((resolve) => {
    const req = https.request({
      host: hostIp,
      port: 443,
      path: item.path,
      method: 'GET',
      headers: {
        'Host': item.domain,
        'User-Agent': 'V7M-Domain-Mesh-Runner/1.0'
      },
      servername: item.domain,
      rejectUnauthorized: false,
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let jsonOk = true;
        if (item.jsonCheck && res.statusCode === 200) {
          try {
            const body = JSON.parse(data);
            jsonOk = body && body.status === 'ok';
          } catch {
            jsonOk = false;
          }
        }
        const isExpected = item.expectedStatus.includes(res.statusCode) && jsonOk;
        resolve({
          success: isExpected,
          status: res.statusCode,
          server: res.headers.server || 'unknown',
          location: res.headers.location || '',
          error: isExpected ? null : ('HTTP ' + res.statusCode)
        });
      });
    });

    req.on('error', (err) => resolve({ success: false, status: 0, server: 'none', error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, status: 0, server: 'none', error: 'Timeout 5s' }); });
    req.end();
  });
}

async function run() {
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const item of DOMAINS_CONFIG) {
    const result = isOriginMode ? await testOrigin(item, originIp) : await testPublic(item);
    results.push({ item, result });

    if (result.skipped) {
      console.log('  ⏭️  ' + item.name.padEnd(28) + ' -> SKIPPED (Hospedado exclusivamente no Cloudflare Pages)');
    } else if (result.success) {
      passed++;
      const detail = result.location ? (' (Redirect -> ' + result.location + ')') : '';
      console.log('  ✅ ' + item.name.padEnd(28) + ' [' + item.domain + item.path + '] -> ' + result.status + detail + ' (' + result.server + ')');
    } else {
      failed++;
      console.log('  ❌ ' + item.name.padEnd(28) + ' [' + item.domain + item.path + '] -> ' + (result.error || ('Status: ' + result.status)) + ' (' + result.server + ')');
    }
  }

  console.log('================================================================');
  console.log('Resumo: ' + passed + ' OK, ' + failed + ' Falhas, ' + DOMAINS_CONFIG.length + ' Total');
  
  if (failed === 0) {
    console.log('✨ SUCESSO: Todos os servicos responderam conforme o contrato!');
    process.exit(0);
  } else {
    console.log('⚠️  ATENCAO: ' + failed + ' servico(s) falharam na verificacao.');
    process.exit(isOriginMode ? 1 : 0);
  }
}

run();
