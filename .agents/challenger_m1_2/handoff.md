# Empirical Challenge Report: Milestone 1 (@v7m/ui Shared Components & State Machine)

**Agent:** Challenger 2 (Empirical Verification & Stress Harness)  
**Working Directory:** `c:\Users\maestri33\dev\v7m\.agents\challenger_m1_2`  
**Timestamp:** `2026-08-28T04:58:00Z`  
**Verdict:** `APPROVE`

---

## 1. Observation

Direct code examination and automated verification suites were executed against `@v7m/ui` components and monorepo workspaces:

### 1.1 RG vs CNH Enforcement (`DocumentResolutionDrawer.tsx`)
- **Code Inspection (`packages/ui/src/components/document-resolution-drawer.tsx:116-132`)**:
  - `handleIdentityUpload` explicitly blocks uploads when `persona === "student"` and `selectedDocTypeChoice === "cnh"` with error message: `"O MEC veda expressamente o uso de CNH para emissão de Certificado EJA. Envie seu RG ou CIN."`
  - In `selectedDocTypeChoice === "cnh"` button click handler (lines 240-259), student persona immediately renders the warning: `"Atenção: Para o Aluno EJA, o MEC/SISTEC exige estritamente RG ou CIN para emissão do diploma. A CNH não é aceita."`
  - For `persona === "promoter"`, both `"rg"` and `"cnh"` allow upload execution and invoke `onResolveUpload(item, file)`.
- **Empirical Execution (`tooling/qa-audit/src/empirical-m1-challenger.mjs`)**:
  - Student + CNH: upload is strictly blocked, `onResolveUpload` is never called, error message returned (`PASS`).
  - Student + RG: upload is approved, `onResolveUpload` is called (`PASS`).
  - Promoter + CNH: upload is approved, `onResolveUpload` is called (`PASS`).
  - Promoter + RG: upload is approved, `onResolveUpload` is called (`PASS`).

### 1.2 Kinship Selection & Address Capture (`AddressProofCapture.tsx` & `DocumentResolutionDrawer.tsx`)
- **Code Inspection (`packages/ui/src/components/address-proof-capture.tsx:48-57, 130-211`)**:
  - `DEFAULT_KINSHIP_OPTIONS` provides 8 categorized relationships (`family`: `conjuge`, `irmao`, `filho`, `avo`, `outro_familiar`; `housing`: `aluguel_locador`, `colega_quarto`, `pensao`).
  - `processFile` enforces MIME formats (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`) and size `<= 15MB`.
  - When `is_own_name === true` or `matched_parent` is defined, the component directly transitions to `satisfied`.
  - When `is_own_name === false`, the component transitions to `needs_kinship`, enabling chip selection and confirmation via `onConfirmKinship`.
  - Upon kinship confirmation, `kinship_provided` is stored and state transitions to `satisfied` with full address presentation and `DocumentInspectorModal` trigger.
- **Empirical Execution (`tooling/qa-audit/src/empirical-m1-challenger.mjs`)**:
  - Direct ownership flow verified (`empty` -> `satisfied`) (`PASS`).
  - Third-party proof flow verified (`empty` -> `needs_kinship` -> `satisfied` after kinship chip selection) (`PASS`).
  - Adversarial format and size boundaries verified (MIME check and 15MB limit trigger `error` step) (`PASS`).

### 1.3 DutyIconBadge & DutyMiniPill Interactive Contracts
- **Code Inspection (`packages/ui/src/components/duty-icon-badge.tsx` & `duty-mini-pill.tsx`)**:
  - Full 6-state lifecycle mapping (`empty`, `analyzing`, `needs_kinship`, `needs_action`, `review`, `approved`).
  - 9 document type icons mapped (`identity`, `selfie`, `address`, `pix`, `school_history`, `civil_certificate`, `voter_card`, `military_certificate`, `contract`).
  - Dynamic button vs span rendering: if `onClick` is provided and `disabled` is false, renders `<button type="button">` with hover scale and keyboard focus rings; otherwise renders accessible `<span>` or `<span role="status">`.
- **Browser DOM Execution (`tooling/qa-audit/src/empirical-m1-dom-challenger.mjs`)**:
  - Click event fires for interactive badge and pill (`PASS`).
  - Disabled badge suppresses click callbacks (`PASS`).
  - Zoom controls in `DocumentInspectorModal` operate across all 7 steps (0.5x to 3.0x) with boundary disabling (`PASS`).
  - Rotate 90° executes full 360° modular rotation cycle (`PASS`).
  - Keyboard shortcuts (`+`, `-`, `0`, `R`, `Escape`) behave correctly (`PASS`).

### 1.4 Workspace Typecheck & Lint
- `pnpm turbo run check-types` executed across all 8 workspaces: 8 successful tasks, 0 errors.

---

## 2. Logic Chain

1. **Observation 1.1** proves that the student persona is protected against MEC regulatory violations by blocking CNH submissions at both the UI choice level and the upload dispatch handler, while the promoter persona correctly accepts either RG or CNH.
2. **Observation 1.2** proves that the proof-first address capture state machine handles both first-party ownership and third-party kinship resolutions, properly transitioning from `needs_kinship` to `satisfied` without forcing manual address re-typing.
3. **Observation 1.3** proves that `DutyIconBadge` and `DutyMiniPill` satisfy both static display requirements in tables/headers and interactive click triggers to open resolution drawers/modals.
4. **Observation 1.4** proves total type safety and build compatibility across the monorepo.

---

## 3. Caveats

- **Webcam Hardware Emulation**: Biometric facial capture in CI/headless environments relies on the fallback file upload selector or mocked video streams; real webcam streaming requires browser user media permissions.
- **Third-Party PDF Renderers**: PDF preview uses native `<iframe>` rendering; mobile webview fallbacks are accommodated by the direct download link and external tab trigger in `DocumentInspectorModal`.

---

## 4. Conclusion

**Verdict:** `APPROVE`

All components in Milestone 1 (`@v7m/ui` Shared Components & State Machine) are fully implemented, structurally compliant with `PROJECT.md` and `ORIGINAL_REQUEST.md`, and pass 100% of empirical test assertions without regressions.

---

## 5. Verification Method

To independently execute and reproduce the empirical verification suites:

1. **Run Programmatic State Machine & Export Test Suite**:
   ```bash
   node tooling/qa-audit/src/empirical-m1-challenger.mjs
   ```
   *Expected Output*: 97 passed assertions, 0 failed, exit code 0.

2. **Run Browser DOM & Interaction Test Suite**:
   ```bash
   node tooling/qa-audit/src/empirical-m1-dom-challenger.mjs
   ```
   *Expected Output*: 13 passed assertions, 0 failed, exit code 0.

3. **Run TypeScript Check Across All Workspaces**:
   ```bash
   pnpm turbo run check-types
   ```
   *Expected Output*: 8 successful tasks, 0 errors.
