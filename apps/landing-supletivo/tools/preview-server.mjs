#!/usr/bin/env node
/**
 * Wrapper para `astro preview` que:
 *  - lê PORT da env (o Playwright `webServer.port` seta isso)
 *  - cai pra 4321 se não tiver env (comportamento histórico)
 *  - cai pra a próxima porta livre se a escolhida já estiver ocupada
 *  - escreve a porta escolhida em `.preview-port` para outros tools lerem
 *
 * Uso direto: PORT=4399 node tools/preview-server.mjs
 * Pelo Playwright: `command: 'node tools/preview-server.mjs'` com `port: 0`
 *                  ou um número específico em `webServer.port`.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const PREFERRED = Number(process.env.PORT) || 4321;
const HOST = process.env.PREVIEW_HOST || '127.0.0.1';

function tryListen(port) {
  return new Promise((resolveP) => {
    const srv = createServer();
    srv.once('error', () => resolveP(null));
    srv.once('listening', () => {
      const addr = srv.address();
      srv.close(() => resolveP(addr.port));
    });
    srv.listen(port, HOST);
  });
}

async function pickPort() {
  // Se PORT foi passado explicitamente, usa exatamente essa porta — sem fallback.
  // Assim o Playwright (que seta PORT) sempre bate com o `webServer.url`.
  if (process.env.PORT) {
    const got = await tryListen(PREFERRED);
    if (got !== PREFERRED) {
      throw new Error(`Port ${PREFERRED} is occupied — refusing to use a different one (PORT was set explicitly). Kill the stale server first.`);
    }
    return PREFERRED;
  }
  for (let p = PREFERRED; p < PREFERRED + 50; p++) {
    const got = await tryListen(p);
    if (got === p) return p;
  }
  throw new Error(`No free port in [${PREFERRED}, ${PREFERRED + 50})`);
}

const port = await pickPort();
const portFile = resolve(process.cwd(), '.preview-port');
writeFileSync(portFile, String(port) + '\n');

const child = spawn(
  process.platform === 'win32' ? 'cmd' : 'npx',
  process.platform === 'win32'
    ? ['/c', 'npx', 'astro', 'preview', '--port', String(port), '--host', HOST]
    : ['astro', 'preview', '--port', String(port), '--host', HOST],
  { stdio: 'inherit' }
);

const cleanup = () => {
  try { unlinkSync(portFile); } catch {}
};
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

child.on('exit', (code, signal) => {
  cleanup();
  process.exit(code ?? (signal ? 1 : 0));
});
