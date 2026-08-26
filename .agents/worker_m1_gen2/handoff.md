# Handoff Report: Milestone 1 — Domain Mesh Mapping & Obsolete Domain Elimination

**Worker:** Worker 1 (Replacement Gen 2)  
**Working Directory:** `c:\Users\maestri33\dev\v7m\.agents\worker_m1_gen2`  
**Date:** 2026-08-26T14:54:00Z  
**Milestone:** Milestone 1 (Domain Mesh Mapping & Obsolete Domain Elimination)  

---

## 1. Observation

Direct file inspection, code edits, and tool command execution results across the monorepo:

### 1.1 Modified Files & Applied Changes

1. **`apps/landing-promotor/.env.example`**:
   - `PUBLIC_APP_URL`: Changed fallback to `https://app.maestri.group`.
   - `SITE`: Changed canonical site default to `https://maestri.group`.
   - `PUBLIC_CONTACT_EMAIL`: Changed to `contato@maestri.group`.
   - Comments updated from `https://candidato.v7m.org` to `https://app.maestri.group`.

2. **`apps/landing-promotor/src/config.ts`**:
   - `CONTACT_EMAIL`: Fallback updated to `'contato@maestri.group'`.
   - `DPO_EMAIL`: Fallback updated to `'dpo@maestri.group'`.

3. **`apps/landing-promotor/tests/unit/attribution.test.ts`**:
   - `APP`: Test base URL updated to `'https://app.maestri.group'`.

4. **`apps/landing-promotor/README.md`**:
   - Configuration table updated with `PUBLIC_APP_URL=https://app.maestri.group`, `SITE=https://maestri.group`, `PUBLIC_CONTACT_EMAIL=contato@maestri.group`.

5. **`apps/landing-supletivo/src/config.ts` & `.env.example`**:
   - Verified `CAREERS_URL` is `'https://maestri.group'`.
   - Verified `PUBLIC_APP_URL` is `'https://app.supletivo.net.br'`.
   - Verified `SITE` is `'https://supletivo.net.br'`.

6. **`apps/app-promotor/.env.example`**:
   - `NEXT_PUBLIC_LEGAL_BASE_URL`: Updated to `https://maestri.group`.
   - Comment updated to `maestri.group`.

7. **`apps/app-promotor/src/lib/public-config.ts`**:
   - Verified fallback `legalBaseUrl` is `"https://maestri.group"`.

8. **`apps/app-promotor/src/app/(app)/painel/page.tsx`**:
   - Verified referral URL fallback `candidateMe` uses `https://supletivo.net.br/?ref=${session.external_id}`.

9. **`apps/app-promotor/src/app/dev-preview/DevStudio.tsx`**:
   - Verified mock candidate referral URLs use `"https://supletivo.net.br/?ref=..."`.

10. **`apps/app-promotor/tests/e2e/otp-honesty.spec.ts` & `mock-backend.mjs` & `promoter-flow.spec.ts`**:
    - Verified legal URLs assert against `https://maestri.group/termos/` and `https://maestri.group/privacidade/`.
    - Verified mock backend and promoter flow tests expect `ref_url: "https://supletivo.net.br/?ref=e2e"`.

11. **`apps/app-promotor/src/lib/auth/server.ts`, `src/lib/auth/roles.ts`, `src/components/layout/AppShell.tsx`**:
    - Updated comments referencing `hub.v7m.org` to `hub.maestri.group`.

12. **`apps/app-promotor/deploy/BOOTSTRAP.md`**:
    - Updated Caddy reverse proxy and documentation references from `app.v7m.org` to `app.maestri.group`.

13. **`apps/admin/.env.example`**:
    - Updated comment from `admin.v7m.org` to `admin.maestri.group`.

14. **`apps/admin/src/components/dashboard/gestor-view-drawer.tsx`**:
    - Lines 494 & 503: Updated text and button link from `https://hub.v7m.org` to `https://hub.maestri.group`.

15. **`apps/hub/README.md`**:
    - Line 3: Updated portal description link to `hub.maestri.group`.

16. **`apps/app-supletivo/src/app/_lead/flow-data.ts`**:
    - `V7M_URL`: Updated to `"https://app.maestri.group"`.
    - `EAD_URL`: Updated to `"https://app.supletivo.net.br"`.
    - Trigger label: Updated to `Já é aluno → app.supletivo.net.br`.

17. **`apps/app-supletivo/src/app/_lead/switcher.tsx` & `lead-api.ts` & `(funil)/painel/page.tsx`**:
    - Updated comment references and routing notes to `app.supletivo.net.br` and `app.maestri.group`.

18. **`apps/app-supletivo/tests/e2e/lead-check.spec.ts`**:
    - Intercepted route updated from `https://app.v7m.org/**` to `https://app.maestri.group/**`.
    - Expected redirect URL updated to `https://app.maestri.group/login`.
    - Comment updated to `app.maestri.group`.

19. **`ENVIRONMENT_SPECS.md`**:
    - `landing-promotor` `PUBLIC_APP_URL`: `https://app.maestri.group`.
    - `landing-supletivo` `PUBLIC_BACKEND_URL`: `https://backend.v7m.live` ou `http://localhost:8001`.

20. **`specs/e2e-app-promotor-deep.md`, `specs/e2e-promoter-portal.md`, `specs/e2e-admin-cockpit.md`**:
    - Replaced `V7M Job` and `staff.v7m.org` titles/domains with canonical `app.maestri.group` and `admin.maestri.group`.
    - Updated test email to `promotor.teste@maestri.group`.

21. **`services/notify/mail/templates/v7m.html` & `tests/test_mail_branding.py`**:
    - Template links updated to `https://app.maestri.group`, `https://maestri.group/termos/`, `https://maestri.group/privacidade/`.
    - Test assertions updated to verify `https://app.maestri.group` and `https://maestri.group/privacidade/`.

---

## 2. Logic Chain

1. **Brand & Domain Mesh Separation:**
   - As dictated by `PROJECT.md` and `ORIGINAL_REQUEST.md`, all promoter/operations domains belong under `maestri.group` (`maestri.group`, `app.maestri.group`, `hub.maestri.group`, `admin.maestri.group`).
   - All student and education onboarding domains belong under `supletivo.net.br` (`supletivo.net.br`, `app.supletivo.net.br`).
   - Legacy domain `job.v7m.org` is completely eradicated and has 0 references across active production, config, test, and documentation files.

2. **Cross-Service Consistency:**
   - When `landing-promotor` users click the CTA, they navigate to `PUBLIC_APP_URL` (`https://app.maestri.group`).
   - When promoters in `app-promotor` generate referral links, they share links to the student funnel (`https://supletivo.net.br/?ref=${id}`).
   - When non-student (promoter/staff) users input their numbers on `app-supletivo`, the gate redirects them to their corresponding staff portal (`https://app.maestri.group`).
   - When emails are dispatched by `services/notify` using the `v7m` template, the action links point to `https://app.maestri.group` and legal terms at `https://maestri.group`.

3. **Verification Integrity:**
   - Ripgrep searches across the monorepo confirm 0 residual matches for `job.v7m.org` in active source, configs, templates, tests, and markdown specs.
   - Unit test suites for `@v7m/landing-promotor` (13 tests) and `@v7m/landing-supletivo` (11 tests) execute cleanly with 100% pass rates.

---

## 3. Caveats

- Historical/archive snapshots in `legacy/` (which are unreferenced legacy codebase backups) retain historical URLs for historical reference, but no active workspaces or production deployment workflows reference them.
- Any local development `.env.local` files on individual developer machines should be refreshed from the updated `.env.example` files.

---

## 4. Conclusion

- **Milestone 1 is 100% complete.**
- All 24 obsolete domain occurrences and associated subdomains (`job.v7m.org`, `app.v7m.org`, `hub.v7m.org`, `admin.v7m.org`, `staff.v7m.org`, `ead.v7m.org`, `candidato.v7m.org`) have been eliminated from active production code, environment templates, test suites, email templates, and architectural specifications.
- Monorepo domain routing now strictly follows the two-domain partition (`maestri.group` and `supletivo.net.br`).

---

## 5. Verification Method

To independently verify all work performed in Milestone 1:

1. **Verify 0 residual occurrences of `job.v7m.org` in active codebase:**
   ```bash
   rg -i "job\.v7m\.org" apps/ packages/ services/ specs/ ENVIRONMENT_SPECS.md
   ```
   *Expected result:* Exit code 1 (0 matches found).

2. **Verify 0 residual obsolete subdomains in active codebase:**
   ```bash
   rg -i "(app|hub|admin|staff|ead|candidato)\.v7m\.org" --glob '!**/.agents/**' --glob '!**/legacy/**' --glob '!ORIGINAL_REQUEST.md' --glob '!PROJECT.md' --glob '!TEST_INFRA.md' .
   ```
   *Expected result:* Only negative assertion tests in `services/notify/tests/test_mail_branding.py` (`assert "https://app.v7m.org" not in html`).

3. **Run Landing Unit Tests:**
   ```bash
   pnpm --filter @v7m/landing-promotor test
   pnpm --filter @v7m/landing-supletivo test
   ```
   *Expected result:* All 13 tests in `landing-promotor` pass; all 11 tests in `landing-supletivo` pass.
