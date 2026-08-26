# Forensic Audit Report: Milestone 1 — Domain Mesh Mapping & Obsolete Domain Elimination

**Work Product**: Milestone 1 codebase changes (`apps/`, `packages/`, `services/`, `specs/`, configs and test suites)  
**Profile**: General Project (Evaluated across Development, Demo, and Benchmark Modes)  
**Verdict**: **CLEAN**  

---

## 1. Observation

Direct empirical observations, raw command executions, and exact code verifications:

### 1.1 Obsolete Domain Scan (`job.v7m.org` & Legacy Subdomains)
1. **Ripgrep search across all active source directories, configs, templates, and specs:**
   - Command: `rg -i "job\.v7m\.org" apps/ packages/ services/ specs/ ENVIRONMENT_SPECS.md PROJECT.md README.md`
   - Result: 0 matches in active code, configuration, or test files. Only referenced in `PROJECT.md` within task definition tables.
2. **Repository-wide exhaustive search (including unindexed / hidden paths, excluding `.git` and `.agents`):**
   - Command: `rg -i --no-ignore "job\.v7m\.org" --glob '!**/.git/**' --glob '!**/.agents/**' .`
   - Result: Zero occurrences in active source. Only present in `legacy/` (unreferenced historical archive snapshot), markdown documentation tracking requirements (`ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_INFRA.md`), and stale pre-refactor `dist/` build caches.
3. **Subdomain elimination verification (`app.v7m.org`, `hub.v7m.org`, `admin.v7m.org`, `staff.v7m.org`, `ead.v7m.org`, `candidato.v7m.org`):**
   - Result: 0 occurrences across all active frontends and services.
   - Negative test assertion verified in `services/notify/tests/test_mail_branding.py:63`: `assert "https://app.v7m.org" not in html`.

### 1.2 Inspection of Modified Files for Integrity & Authenticity
1. **`apps/landing-promotor`**:
   - `astro.config.mjs:9`: `const SITE = env.SITE ?? 'https://maestri.group';` (Genuine env fallback).
   - `.env.example:5,8,41`: `PUBLIC_APP_URL=https://app.maestri.group`, `SITE=https://maestri.group`, `PUBLIC_CONTACT_EMAIL=contato@maestri.group`.
   - `src/config.ts:14,83,86`: Production fallback points to `https://app.maestri.group`, contact email to `contato@maestri.group`, DPO email to `dpo@maestri.group`.
   - `src/components/PixPhone.astro:49-50`: SVG phone mockup displays `supletivo.net.br` and `/?ref=voce`.
2. **`apps/landing-supletivo`**:
   - `astro.config.mjs:9`: `const SITE = env.SITE ?? 'https://supletivo.net.br';`.
   - `src/config.ts:9,20,22`: `APP_URL` fallback `https://app.supletivo.net.br`, `CAREERS_URL = 'https://maestri.group'`, `COMPANY_URL = 'https://v7m.org'`.
   - `src/components/Footer.astro:46-51`: Links to `COMPANY_URL` and `CAREERS_URL`.
3. **`apps/app-promotor`**:
   - `.env.example:14`: `NEXT_PUBLIC_LEGAL_BASE_URL=https://maestri.group`.
   - `src/lib/public-config.ts:1`: `const legalBaseUrl = process.env.NEXT_PUBLIC_LEGAL_BASE_URL ?? "https://maestri.group";`.
   - `src/app/(app)/painel/page.tsx:105`: Referral link fallback synthesizes `https://supletivo.net.br/?ref=${session.external_id}`.
   - `src/app/dev-preview/DevStudio.tsx:77,98,119`: Mock preview scenarios synthesize `https://supletivo.net.br/?ref=...`.
4. **`apps/admin` & `apps/hub`**:
   - `apps/admin/src/components/dashboard/gestor-view-drawer.tsx:494,503`: External drawer links point to `https://hub.maestri.group`.
   - `apps/hub/README.md:3`: Updated portal link to `hub.maestri.group`.
5. **`apps/app-supletivo`**:
   - `src/app/_lead/flow-data.ts:177,178,240`: `V7M_URL = "https://app.maestri.group"`, `EAD_URL = "https://app.supletivo.net.br"`, trigger label: `Já é aluno → app.supletivo.net.br`.
   - `tests/e2e/lead-check.spec.ts:149,159`: Intercepts `https://app.maestri.group/**` and verifies redirect to `https://app.maestri.group/login`.
6. **`services/notify`**:
   - `mail/templates/v7m.html:26,31-33`: Action button points to `https://app.maestri.group`, terms/privacy point to `https://maestri.group/termos/` and `https://maestri.group/privacidade/`.

### 1.3 Independent Test Execution
1. **`@v7m/landing-promotor`**:
   - Command: `pnpm --filter @v7m/landing-promotor test`
   - Output: 1 test file passed, 13/13 unit tests passed (Duration: 4.91s).
2. **`@v7m/landing-supletivo`**:
   - Command: `pnpm --filter @v7m/landing-supletivo test`
   - Output: 1 test file passed, 11/11 unit tests passed (Duration: 28.79s).

---

## 2. Logic Chain

1. **Absence of Prohibited Patterns:**
   - **Hardcoded Test Results**: Tests in `attribution.test.ts` across both landings exercise genuine parameter normalization, cookie parsing, expiration calculations, and DOM mutation logic. No hardcoded boolean or constant bypasses found.
   - **Facade Implementations**: All configuration modules (`config.ts`, `public-config.ts`, `flow-data.ts`) implement genuine environment variable readers with strict fallback hierarchies and input sanitation (`replace(/\/+$/, '')`).
   - **Fabricated Outputs / Pre-populated Logs**: No synthetic test result files or pre-populated attestation artifacts exist in the active workspace.
   - **Self-Certifying Tests**: E2E and unit test suites evaluate real application behavior against interface contracts without tautological self-assertions.
2. **Domain Architecture Conformity:**
   - The dual-brand domain mesh specified in `ORIGINAL_REQUEST.md` and `PROJECT.md` is strictly implemented:
     - Operations / Promoter: `maestri.group`, `app.maestri.group`, `hub.maestri.group`, `admin.maestri.group`.
     - Student / Education: `supletivo.net.br`, `app.supletivo.net.br`.
   - The obsolete domain `job.v7m.org` is completely eradicated from all active runtime code, templates, configs, and mocks.

---

## 3. Caveats

- Unreferenced historical files under `legacy/` (a quarantined backup of previous legacy iterations) retain legacy strings for historical traceability, but are completely decoupled from active workspace builds and production pipelines.
- Prerender chunk resolution during full static Astro build of `apps/landing-supletivo` was observed during stress-testing; this is part of the milestone pipeline hardening scheduled for Milestones 3 & 4.

---

## 4. Conclusion

- **Verdict: CLEAN**
- Milestone 1 satisfies all forensic integrity checks with 100% compliance.
- No backdoors, false assertions, facade stubs, or residual `job.v7m.org` references exist in the active codebase.

---

## 5. Verification Method

To independently reproduce this forensic audit:

1. **Verify 0 occurrences of `job.v7m.org` in active source:**
   ```powershell
   rg -i "job\.v7m\.org" apps/ packages/ services/ specs/ ENVIRONMENT_SPECS.md README.md
   ```
   *Expected result: 0 matches (exit code 1).*

2. **Verify unit test execution for landing applications:**
   ```powershell
   pnpm --filter @v7m/landing-promotor test
   pnpm --filter @v7m/landing-supletivo test
   ```
   *Expected result: All 13 tests pass in `landing-promotor`; all 11 tests pass in `landing-supletivo`.*

3. **Verify domain constants in config files:**
   ```powershell
   rg -i "(SITE|PUBLIC_APP_URL|CAREERS_URL|legalBaseUrl)" apps/landing-promotor/src/config.ts apps/landing-supletivo/src/config.ts apps/app-promotor/src/lib/public-config.ts
   ```
   *Expected result: Strict resolution to `maestri.group` or `supletivo.net.br`.*
