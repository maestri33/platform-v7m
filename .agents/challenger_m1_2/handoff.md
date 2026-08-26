# Challenger Report: Milestone 1 — Test Suites & Runtime Contracts Verification

**Challenger:** Challenger 2 (Empirical Test & Mock Verifier)  
**Working Directory:** `c:\Users\maestri33\dev\v7m\.agents\challenger_m1_2`  
**Date:** 2026-08-26T15:08:00Z  
**Verdict:** **REQUEST_CHANGES**  

---

## 1. Observation

Direct empirical command executions, code inspections, and pattern searches performed:

### 1.1 Empirical Unit Test Runs

1. **`apps/landing-promotor` Unit Tests (`vitest run`):**
   - Command: `pnpm --filter @v7m/landing-promotor test`
   - Output:
     ```
     RUN  v4.1.11 C:/Users/maestri33/dev/v7m/apps/landing-promotor
     ✓ tests/unit/attribution.test.ts (13 tests) 34ms
     Test Files  1 passed (1)
          Tests  13 passed (13)
     ```
   - Observed: All 13 tests passed. Line 8 explicitly sets `const APP = 'https://app.maestri.group';` and confirms CTA decoration properly routes with canonical app domain.

2. **`apps/landing-supletivo` Unit Tests (`vitest run`):**
   - Command: `pnpm --filter @v7m/landing-supletivo test`
   - Output:
     ```
     RUN  v4.1.11 C:/Users/maestri33/dev/v7m/apps/landing-supletivo
     ✓ tests/unit/attribution.test.ts (11 tests) 15ms
     Test Files  1 passed (1)
          Tests  11 passed (11)
     ```
   - Observed: All 11 tests passed. Lines 98–121 assert decoration on `https://app.supletivo.net.br`.

3. **`services/notify` Mail Branding & Unit Tests (`pytest`):**
   - Command: `services\notify\.venv\Scripts\python.exe -m pytest services/notify/tests/test_mail_branding.py`
   - Output: `5 passed in 0.10s` (100% pass rate).
   - Command: `services\notify\.venv\Scripts\python.exe -m pytest services/notify/tests -k "not e2e and not browser and not live"`
   - Output: `252 passed, 17 deselected in 573.14s` (100% pass rate).

### 1.2 Inspection of Test Mocks & Contract Assertions

1. **`apps/app-promotor/tests/e2e/otp-honesty.spec.ts`:**
   - Lines 136–144:
     ```typescript
     await expect(page.getByRole("link", { name: "Termos" })).toHaveAttribute(
       "href",
       "https://maestri.group/termos/",
     );
     await expect(page.getByRole("link", { name: "Privacidade" })).toHaveAttribute(
       "href",
       "https://maestri.group/privacidade/",
     );
     ```
   - Observed: Verified terms and privacy links assert against canonical `maestri.group`.

2. **`apps/app-promotor/tests/e2e/mock-backend.mjs`:**
   - Line 455:
     ```javascript
     ref_url: "https://supletivo.net.br/?ref=e2e",
     ```
   - Observed: Mock backend serves promoter referral URL pointing to student onboarding domain `https://supletivo.net.br/?ref=e2e`.

3. **`apps/app-promotor/tests/e2e/promoter-flow.spec.ts`:**
   - Lines 49 & 71:
     ```typescript
     await expect(page.locator("code").filter({ hasText: "https://supletivo.net.br/?ref=e2e" })).toBeVisible();
     // ...
     expect(href).toContain(encodeURIComponent("https://supletivo.net.br/?ref=e2e"));
     ```
   - Observed: Asserts DOM referral code box and WhatsApp share URI contain `https://supletivo.net.br/?ref=e2e`.

4. **`apps/app-supletivo/tests/e2e/lead-check.spec.ts`:**
   - Lines 149–160:
     ```typescript
     await page.route("https://app.maestri.group/**", (route) =>
       route.fulfill({ status: 200, contentType: "text/html", body: "<h1>portal</h1>" }),
     );
     // ...
     await dialog(page, "Acesso em outro ambiente")
       .getByRole("button", { name: /portal/i })
       .click();
     await expect(page).toHaveURL("https://app.maestri.group/login");
     ```
   - Observed: Intercepts `https://app.maestri.group/**` and verifies non-student portal button redirects to `https://app.maestri.group/login`.

---

### 1.3 Adversarial Discovery: Defect in `apps/app-promotor/tests/e2e/promoter-deep.spec.ts`

During comprehensive deep regex scanning across all E2E spec files in `apps/app-promotor/tests/e2e/`, the following hardcoded obsolete regex assertion was uncovered:

**`apps/app-promotor/tests/e2e/promoter-deep.spec.ts` (lines 290–292 & line 94):**
```typescript
94:       await emailInput.fill("promotor.teste@v7m.org");
...
290:       await expect(page.getByText(/Seu link de indicação/i)).toBeVisible();
291:       const codeBlock = page.locator("code").filter({ hasText: /https:\/\/job\.v7m\.org\/\?ref=/i });
292:       await expect(codeBlock).toBeVisible();
```

- **Defect Analysis:** Line 291 in TC-PROMOTOR-DEEP-015 explicitly asserts that the referral link contains `/https:\/\/job\.v7m\.org\/\?ref=/i`. Because the production codebase and mock backend now generate `https://supletivo.net.br/?ref=...`, when `promoter-deep.spec.ts` is executed, TC-PROMOTOR-DEEP-015 will fail.
- **Why it escaped previous checks:** The search for literal string `job.v7m.org` did not match the escaped regex literal `job\.v7m\.org` with backslashes.

---

## 2. Logic Chain

1. **Unit Test Verification:**
   - Vitest tests in `apps/landing-promotor` (13/13) and `apps/landing-supletivo` (11/11) verify that attribution scripts capture referral tokens and construct outbound links targeting `https://app.maestri.group` and `https://app.supletivo.net.br`.
   - Pytest tests in `services/notify` (252/252) confirm template rendering and domain isolation.

2. **E2E Contract Consistency:**
   - In `app-promotor`, the mock backend (`mock-backend.mjs:455`) emits `https://supletivo.net.br/?ref=e2e`.
   - `promoter-flow.spec.ts` correctly asserts this canonical URL.
   - In `app-supletivo`, `lead-check.spec.ts` correctly asserts cross-portal redirection to `https://app.maestri.group/login`.

3. **Adversarial Challenge Finding:**
   - `apps/app-promotor/tests/e2e/promoter-deep.spec.ts:291` was not updated to canonical `https://supletivo.net.br/?ref=`.
   - This causes an active test failure in the E2E test suite under `TC-PROMOTOR-DEEP-015`.
   - Therefore, Milestone 1 cannot be approved without fixing this test assertion.

---

## 3. Caveats

- Playwright browser execution for the entire E2E suite requires running the local web server and mock backend concurrently (evaluated statically and via targeted mock execution).
- `services/notify` has `exit 1` in `package.json` test script, which is scheduled for neutralization in Milestone 3 (Feature 14).

---

## 4. Conclusion

- **Verdict:** **REQUEST_CHANGES**
- **Action Required:**
  - In `apps/app-promotor/tests/e2e/promoter-deep.spec.ts`:
    - Line 291: Replace `/https:\/\/job\.v7m\.org\/\?ref=/i` with `/https:\/\/supletivo\.net\.br\/\?ref=/i` (or `/https:\/\/(supletivo\.net\.br|app\.maestri\.group)\/\?ref=/i`).
    - Line 94: Replace `promotor.teste@v7m.org` with `promotor.teste@maestri.group` (to align with `specs/e2e-app-promotor-deep.md`).

---

## 5. Verification Method

To verify the finding and the required fix:

1. **Verify the defect in `promoter-deep.spec.ts`:**
   ```bash
   rg "job" apps/app-promotor/tests/e2e/promoter-deep.spec.ts
   ```
   *Observed result:* Line 291 contains `hasText: /https:\/\/job\.v7m\.org\/\?ref=/i`.

2. **Verify unit test execution:**
   ```bash
   pnpm --filter @v7m/landing-promotor test
   pnpm --filter @v7m/landing-supletivo test
   ```
   *Expected result:* 13 passed in landing-promotor, 11 passed in landing-supletivo.

3. **Verify mail branding test execution:**
   ```bash
   services\notify\.venv\Scripts\python.exe -m pytest services/notify/tests/test_mail_branding.py
   ```
   *Expected result:* 5 passed in 0.10s.

---

## Challenge Report Summary

**Overall risk assessment**: MEDIUM

### Challenge 1: Obsolete Domain Assertion in `apps/app-promotor/tests/e2e/promoter-deep.spec.ts:291`
- **Assumption challenged**: All E2E test specs and assertions were claimed updated to canonical domains.
- **Attack scenario**: Running `npx playwright test apps/app-promotor/tests/e2e/promoter-deep.spec.ts` fails at TC-PROMOTOR-DEEP-015 because the app generates `https://supletivo.net.br/?ref=...` while the locator filters for `/https:\/\/job\.v7m\.org\/\?ref=/i`.
- **Blast radius**: E2E test failure and residual obsolete domain reference in active test specs.
- **Mitigation**: Update line 291 to `/https:\/\/supletivo\.net\.br\/\?ref=/i` and line 94 to `promotor.teste@maestri.group`.

### Stress Test Results
| Test Suite / Target | Action | Result | Status |
|---------------------|--------|--------|--------|
| `@v7m/landing-promotor` | `vitest run` (13 unit tests) | 13 passed (100%) | PASS |
| `@v7m/landing-supletivo` | `vitest run` (11 unit tests) | 11 passed (100%) | PASS |
| `services/notify` branding | `pytest test_mail_branding.py` | 5 passed (100%) | PASS |
| `services/notify` unit suite | `pytest` (252 unit tests) | 252 passed (100%) | PASS |
| `app-promotor/otp-honesty.spec.ts` | Terms/Privacy domain assert | `https://maestri.group` | PASS |
| `app-promotor/mock-backend.mjs` | `ref_url` domain payload | `https://supletivo.net.br/?ref=e2e` | PASS |
| `app-promotor/promoter-flow.spec.ts` | Referral link & WhatsApp DOM assert | `https://supletivo.net.br/?ref=e2e` | PASS |
| `app-supletivo/lead-check.spec.ts` | Portal redirect assertion | `https://app.maestri.group/login` | PASS |
| `app-promotor/promoter-deep.spec.ts:291` | TC-PROMOTOR-DEEP-015 referral assert | `/https:\/\/job\.v7m\.org\/\?ref=/i` | **FAIL** (Defect) |

### Unchallenged Areas
- Live external network calls (all tests use localized stubs or mock-backend).
