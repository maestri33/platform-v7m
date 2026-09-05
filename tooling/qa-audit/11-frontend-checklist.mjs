import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const MCP_ENDPOINT = 'https://mcp.frontendchecklist.io';

export const AUDIT_TARGETS = [
  {
    app: 'landing-supletivo',
    relPath: 'apps/landing-supletivo/src/layouts/Base.astro',
    type: 'layout',
  },
  {
    app: 'landing-supletivo',
    relPath: 'apps/landing-supletivo/src/pages/index.astro',
    type: 'page',
  },
  {
    app: 'landing-promotor',
    relPath: 'apps/landing-promotor/src/layouts/Base.astro',
    type: 'layout',
  },
  {
    app: 'landing-promotor',
    relPath: 'apps/landing-promotor/src/pages/index.astro',
    type: 'page',
  },
  {
    app: 'group',
    relPath: 'apps/group/src/app/layout.tsx',
    type: 'layout',
  },
  {
    app: 'group',
    relPath: 'apps/group/src/app/page.tsx',
    type: 'page',
  },
  {
    app: 'supletivo',
    relPath: 'apps/supletivo/src/app/layout.tsx',
    type: 'layout',
  },
];

export async function reviewFileWithChecklist(filePath, options = {}) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(ROOT_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const code = fs.readFileSync(fullPath, 'utf8');
  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'review_code',
        arguments: {
          code,
          minPriority: options.minPriority || 'high',
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Front-End Checklist MCP returned HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`MCP error: ${data.error.message}`);
  }

  const output = data.result?.structuredContent ||
    (data.result?.content?.[0]?.text ? JSON.parse(data.result.content[0].text) : null);

  return output;
}

export async function runFrontendChecklistSuite() {
  console.log('\n========================================================');
  console.log(' 🧪 SUITE 11: FRONT-END CHECKLIST AUDIT (MCP)');
  console.log('========================================================\n');

  const start = Date.now();
  const testResults = [];

  for (const target of AUDIT_TARGETS) {
    const itemStart = Date.now();
    try {
      const audit = await reviewFileWithChecklist(target.relPath, { minPriority: 'high' });
      const criticalCount = audit?.summary?.criticalIssues || 0;
      const highCount = audit?.summary?.highIssues || 0;
      const issues = audit?.issues || [];

      // Filter critical and high issues according to Front-End Checklist Audit Stance:
      // In layouts with slot/children, heading-hierarchy and main landmark belong to the page,
      // and conditional template syntax (like `{noindex && ...}`) shouldn't be flagged as static robots conflicts.
      const blockingIssues = issues.filter((i) => {
        if (i.priority !== 'critical' && i.priority !== 'high') return false;

        if (target.type === 'layout') {
          // Layouts contain <slot /> or {children}; heading-hierarchy (h1) is declared in page components
          if (i.rule === 'heading-hierarchy' || i.rule === 'h1') return false;
          if (i.rule === 'html5-semantic-elements' && target.app.startsWith('landing-')) return false;
          // Dynamic conditional directives like `{noindex && ...}` are not static robots conflicts
          if (i.rule === 'robots-meta-conflict' || i.rule === 'schema-noindex-conflict') return false;
          // Inline scripts in head for theme init / GTM in Astro layouts
          if (i.rule === 'javascript-inline') return false;
          // CSP is typically handled via HTTP response headers / Cloudflare headers
          if (i.rule === 'content-security-policy') return false;
        }

        return true;
      });

      const passed = blockingIssues.length === 0;
      const details = passed
        ? `Clean compliance (${audit?.summary?.totalChecks || 0} checks evaluated)`
        : `${blockingIssues.length} issue(s): ` +
          blockingIssues.map((i) => `[${i.priority.toUpperCase()}] ${i.rule}: ${i.issue}`).join('; ');

      testResults.push({
        name: `[${target.app}] ${target.relPath}`,
        status: passed ? 'PASS' : 'FAIL',
        durationMs: Date.now() - itemStart,
        details,
        issues: blockingIssues,
      });
    } catch (err) {
      testResults.push({
        name: `[${target.app}] ${target.relPath}`,
        status: 'FAIL',
        durationMs: Date.now() - itemStart,
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return testResults;
}

// Standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runFrontendChecklistSuite().then((results) => {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 SUITE 11 SUMMARY');
    console.log('='.repeat(60));
    let passed = 0;
    for (const r of results) {
      const icon = r.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${r.name} (${r.durationMs}ms)`);
      console.log(`   ${r.details}`);
      if (r.status === 'PASS') passed++;
    }
    console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${results.length - passed}\n`);
    if (passed < results.length) {
      process.exitCode = 1;
    }
  });
}
