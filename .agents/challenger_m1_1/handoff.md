# Challenger Review & Verification Report: Milestone 1 (@v7m/ui Shared Components & State Machine)

**Agent:** Challenger 1 (`challenger_m1_1`)  
**Working Directory:** `c:\Users\maestri33\dev\v7m\.agents\challenger_m1_1`  
**Timestamp:** `2026-08-28T04:54:30Z`  
**Target Milestone:** M1 — Design System Components, Resolution Drawer, and Inspection Modal  
**Verdict:** **`APPROVE`**

---

## 1. Observation

Direct code examination, type checking, and empirical stress-testing across `packages/ui` and the monorepo yielded the following verified facts:

### 1.1 DocumentInspectorModal (`packages/ui/src/components/document-inspector-modal.tsx`)
- **Zoom limits & steps (Lines 38, 48, 67-73, 89-95)**:
  - `ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0]`.
  - Default index is `2` (`1.0x` / `100%`).
  - Zoom-in is clamped at index `6` (`3.0x` / `300%`) via `Math.min(ZOOM_STEPS.length - 1, prev + 1)`.
  - Zoom-out is clamped at index `0` (`0.5x` / `50%`) via `Math.max(0, prev - 1)`.
- **Rotation modulo math (Lines 49, 74-76, 91)**:
  - Rotation is calculated via `(prev + 90) % 360`, yielding strict cyclical states `0 -> 90 -> 180 -> 270 -> 0`.
- **Keyboard shortcuts (Lines 64-77)**:
  - `Escape` invokes `onClose()`.
  - `+` / `=` triggers zoom-in, `-` triggers zoom-out, `0` resets zoom and rotation, `R` / `G` rotates 90° clockwise.
- **Rendering branches & Dossier panel (Lines 86, 221-259, 263-376)**:
  - Supports PDF `<iframe>`, high-resolution `<img>`, and digital certification fallback.
  - Collapsible Dossier panel displays extracted OCR text, kinship holder data, ArcFace score, and cryptographic seal.

### 1.2 ContractSigner (`packages/ui/src/components/contract-signer.tsx`)
- **Scroll progress calculation & unlock threshold (Lines 81-96)**:
  - Calculates `maxScroll = scrollHeight - clientHeight`. If `maxScroll <= 0`, auto-unlocks (`progress: 1`, `hasScrolledToBottom: true`), preventing lock-in bugs on large viewport displays.
  - For scrollable content, calculates `currentProgress = Math.min(1, Math.max(0, scrollTop / maxScroll))` and unlocks when `currentProgress >= 0.9` OR `scrollTop + clientHeight >= scrollHeight - 24`.
- **Signature gate conditions (Lines 98-99, 394)**:
  - Enforces `!hasScrolledToBottom || !acceptedCheckbox || disabled || isSigning` before permitting signature execution.
- **Seal & Contract versioning (Lines 42-53, 107-114)**:
  - Generates seal in format `V7M-SIG-<HEX>-<RANDOM>`.
  - Distinguishes versions: Promoter uses `TERM-PROMOTOR-V2026.1`; Student uses `CONTRATO-EJA-V2026.1`.

### 1.3 BiometricsLivenessCapture (`packages/ui/src/components/biometrics-liveness-capture.tsx`)
- **Cosine similarity score evaluation (Lines 51, 101-103, 149)**:
  - Default `minScoreThreshold = 0.65`.
  - Approval condition: `Boolean(score && score >= minScoreThreshold)`.
- **Camera Fallback & Flip (Lines 61, 114-132, 134-137, 252-284, 325-333)**:
  - On `cameraError` (e.g. denied webcam permissions), displays warning alert and activates gallery upload button linking to `<input type="file" accept="image/*" />`.
  - Supports toggling `facingMode` between `"user"` and `"environment"`.

### 1.4 DutyIconBadge & DutyMiniPill (`packages/ui/src/components/duty-icon-badge.tsx`, `duty-mini-pill.tsx`)
- **6 Lifecycle States mapped**:
  - `empty` (⚪ Pendente)
  - `analyzing` (🔵 Lendo OCR...)
  - `needs_kinship` (🟡 Vínculo Pendente)
  - `needs_action` (🔴 Ajuste Necessário)
  - `review` (🟠 Em Análise)
  - `approved` (🟢 Verificado ✓)
- **9 Document types supported** across `DOCUMENT_ICONS`: `identity`, `selfie`, `address`, `pix`, `school_history`, `civil_certificate`, `voter_card`, `military_certificate`, `contract`.

### 1.5 DocumentResolutionDrawer & AddressProofCapture
- **Dual persona RG vs CNH regulatory enforcement (`document-resolution-drawer.tsx:117-120, 241-274`)**:
  - Student persona: Blocks CNH selection with alert: *"O MEC veda expressamente o uso de CNH para emissão de Certificado EJA. Envie seu RG ou CIN."*
  - Promoter persona: Permits both RG and CNH.

### 1.6 Empirical Test Execution Results
Executed test harness `tooling/qa-audit/src/verify-m1-logic.mjs`:
```
▶ DocumentInspectorModal Mathematical & State Harness
  ✔ should have correct initial zoom at 1.0x (100%) and 0 deg rotation (0.9987ms)
  ✔ should correctly clamp zoom in at max step 3.0x (300%) (0.2175ms)
  ✔ should correctly clamp zoom out at min step 0.5x (50%) (0.175ms)
  ✔ should step through all zoom levels accurately (1.3975ms)
  ✔ should cycle rotation clockwise modulo 360 correctly (0.2333ms)
  ✔ should withstand stress testing of 10,000 rotations without floating drift (2.6808ms)
  ✔ should correctly classify PDF vs Image MIME types and URLs (0.3365ms)
✔ DocumentInspectorModal Mathematical & State Harness (7.6715ms)
▶ ContractSigner Scroll Math & Digital Seal Harness
  ✔ should auto-unlock when contract content fits without scrolling (maxScroll <= 0) (0.5233ms)
  ✔ should keep contract locked when at top of large document (0.1893ms)
  ✔ should keep contract locked at 50% and 85% progress (0.3592ms)
  ✔ should unlock contract at >= 90% scroll progress (0.3722ms)
  ✔ should unlock contract when within 24px of bottom boundary (0.1641ms)
  ✔ should clamp progress on negative or over-scroll boundaries (0.0903ms)
  ✔ should strictly enforce all conditions in signature gate truth table (0.1074ms)
  ✔ should generate standard cryptographic seal format (0.3892ms)
  ✔ should assign correct contract versions per persona (0.1164ms)
✔ ContractSigner Scroll Math & Digital Seal Harness (2.9019ms)
▶ BiometricsLivenessCapture Threshold & Fallback Harness
  ✔ should evaluate cosine similarity score threshold accurately (0.1416ms)
  ✔ should support custom thresholds (0.0937ms)
  ✔ should properly format score percentage strings (0.1413ms)
  ✔ should toggle facingMode between user and environment (0.1025ms)
✔ BiometricsLivenessCapture Threshold & Fallback Harness (0.6347ms)
▶ DutyIconBadge & DutyMiniPill Lifecycle Machine
  ✔ should support all 6 required lifecycle states (0.1511ms)
  ✔ should support all 9 document type keys (0.0552ms)
✔ DutyIconBadge & DutyMiniPill Lifecycle Machine (0.3179ms)
▶ DocumentResolutionDrawer Regulatory RG vs CNH Enforcement
  ✔ should block CNH upload for Student persona with regulatory error (0.123ms)
  ✔ should permit RG/CIN upload for Student persona (0.0511ms)
  ✔ should permit both RG and CNH uploads for Promoter persona (0.1077ms)
✔ DocumentResolutionDrawer Regulatory RG vs CNH Enforcement (0.4145ms)
ℹ tests 25
ℹ suites 5
ℹ pass 25
ℹ fail 0
```

### 1.7 Compiler & Type Check Verification
- `pnpm --filter @v7m/ui check-types` ➔ Exit code 0 (0 errors).
- `pnpm turbo run check-types` ➔ 8 successful tasks, 0 errors.
- `pnpm --filter @v7m/app-promotor build` ➔ Next.js 16 build succeeded with 0 compilation errors.

---

## 2. Logic Chain

1. **Bounding and Clamping Soundness**: Direct evaluation of index-bounded array lookups (`ZOOM_STEPS[zoomIndex]`) and integer arithmetic (`(r + 90) % 360`) proves that `DocumentInspectorModal` cannot produce `undefined` styles, out-of-bounds scale factors, or non-modulo rotation angles (Observation 1.1, 1.6).
2. **Scroll Lock Safety**: The scroll progress calculation handles zero and negative `maxScroll` edge cases gracefully, preventing scenarios where users with large displays cannot unlock the agreement because the text doesn't overflow (Observation 1.2, 1.6).
3. **Threshold and Fallback Integrity**: `BiometricsLivenessCapture` strictly gates on `minScoreThreshold = 0.65` and provides a robust fallback path to file selection when webcam access is denied (Observation 1.3, 1.6).
4. **Persona and Regulatory Enforcement**: `DocumentResolutionDrawer` correctly distinguishes between student and promoter document rules, blocking CNH for students while allowing it for promoters (Observation 1.5, 1.6).
5. **Contract and Export Completeness**: All components, types, and icons are exported via `packages/ui/src/index.ts` and `components/index.ts` with zero type collisions or missing references (Observation 1.7).

---

## 3. Caveats

1. **Physical Webcam Simulation**: The webcam tests verify logic, state transitions, fallback inputs, and threshold evaluation. Physical hardware video capture and real stream parsing are tested during Playwright browser automation in Milestone 4.
2. **PDF Webview Compatibility**: Mobile webviews with disabled inline PDF renderers fall back to the modal's external download and "Abrir em Nova Aba" links.

---

## 4. Conclusion

**Verdict: `APPROVE`**

Milestone 1 satisfies all functional, mathematical, regulatory, and architectural criteria outlined in `PROJECT.md` and `ORIGINAL_REQUEST.md`. All components are type-safe, resilient against boundary conditions, and ready for integration into the portal resolution routes (Milestone 2).

---

## 5. Verification Method

To independently verify these results:

1. **Execute Empirical Test Harness**:
   ```bash
   node --test tooling/qa-audit/src/verify-m1-logic.mjs
   ```
   *Expected Output*: 25 tests pass, 0 failures.

2. **Verify TypeScript across Monorepo**:
   ```bash
   pnpm turbo run check-types
   ```
   *Expected Output*: 8 successful tasks, 0 errors.

3. **Verify Next.js Production Build**:
   ```bash
   pnpm --filter @v7m/app-promotor build
   ```
   *Expected Output*: Build completes with exit code 0.
