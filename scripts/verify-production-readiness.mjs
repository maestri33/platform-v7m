import fs from 'node:fs';
import { execSync } from 'node:child_process';

console.log('🔍 V7M — Auditoria de Prontidao para Producao & Deploy CI/CD (Issue #18)');

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log('  ✅ PASS: ' + name);
  } catch (err) {
    console.error('  ❌ FAIL: ' + name + ' -> ' + err.message);
    failures++;
  }
}

// 1. Workflow deploy.yml matrix
check('deploy.yml possui todos os 6 containers na matriz', () => {
  const f = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
  const services = ['backend', 'notify', 'app-promotor', 'admin', 'hub', 'app-supletivo'];
  for (const s of services) {
    if (!f.includes(s)) throw new Error('Servico ausente no deploy.yml: ' + s);
  }
});

// 2. Dockerfiles dos frontends
check('Dockerfiles standalone dos 4 frontends existem', () => {
  const apps = ['apps/app-promotor/Dockerfile', 'apps/admin/Dockerfile', 'apps/hub/Dockerfile', 'apps/app-supletivo/Dockerfile'];
  for (const p of apps) {
    if (!fs.existsSync(p)) throw new Error('Dockerfile ausente: ' + p);
  }
});

// 3. Documentacao canonica de deploy
check('docs/deployment/production-deployment-guide.md existe', () => {
  if (!fs.existsSync('docs/deployment/production-deployment-guide.md')) throw new Error('Arquivo ausente');
});

// 4. Version check integrity
check('Version check do monorepo sincronizado', () => {
  execSync('pnpm run version:check', { stdio: 'pipe' });
});

console.log('--------------------------------------------------');
if (failures === 0) {
  console.log('✨ AUDITORIA DE PRODUCAO 100% APROVADA (0 falhas)!');
  process.exit(0);
} else {
  console.error('🚨 AUDITORIA FALHOU COM ' + failures + ' ERRO(S).');
  process.exit(1);
}
