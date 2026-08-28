# Handoff Report: Phase 0 Survey — Admin App & E2E Test Infrastructure for Document Hub & Live Status Indicator System

## 1. Observation

Direct examination of `apps/admin`, `tooling/qa-audit`, and Playwright test configurations across the monorepo yielded the following verified facts:

### 1.1 `apps/admin` Architecture & UI Components
- **Navigation & Layout**:
  - `apps/admin/src/components/ui/admin-nav.tsx`: Contains sticky sidebar / horizontal mobile navigation bar with 14 sections (`/dashboard`, `/financeiro`, `/documentos`, `/rede`, `/polos`, `/coordenadores`, `/treino`, `/matriculas`, `/alunos`, `/leads`, `/usuarios`, `/configuracoes`, `/integracoes`, `/logs`, `/notificacoes`).
  - `apps/admin/src/components/ui/app-header.tsx`: Global top header bar displaying `V7M Staff` brand mark and greeting (`Olá, {firstName}`).
- **Cockpit Overviews & Management Tabs**:
  - `apps/admin/src/app/(app)/dashboard/page.tsx`: Central dashboard containing `DashboardHeader`, `KpiGrid`, `PolosOverviewCard`, `PoloStatsBreakdown`, `SummaryBreakdown`, and tabs for `LeadsManagerTab`, `StudentsManagerTab`, `PromotersManagerTab`, `CoordinatorsManagerTab`, `NotificationsEditorTab`.
  - `apps/admin/src/components/dashboard/students-manager-tab.tsx`: Student & enrollment management tab with search, polo selector filter, credential management modal (`EditCredentialsModal`), and generic `StatusPill` components.
  - `apps/admin/src/components/dashboard/promoters-manager-tab.tsx`: Promoter and team management tab with coordinator badges and phone rescue modal (`PhoneRescueModal`).
  - `apps/admin/src/components/dashboard/leads-manager-tab.tsx`: Lead list with conversion rate KPIs, search, polo filter, status filter, and manual payment confirmation dialog (`ConfirmDialog`).
  - `apps/admin/src/app/(app)/alunos/page.tsx` and `apps/admin/src/app/(app)/matriculas/page.tsx`: Dedicated pages wrapping `StudentsManagerTab` and `GlobalList` with status pills.
- **Document Review Desk & Inspection Workflows**:
  - `apps/admin/src/app/(app)/documentos/page.tsx`: Production staff document review desk ("Mesa de Conferência de Documentos & Biometria").
    - Fetches pending reviews from `GET /api/v1/staff/documents/reviews` with category filters (`all`, `rg`, `selfie`, `enrollment`, `candidate`).
    - Opens Dual-View Dossier Modal via `openDossier(userExternalId)` fetching `GET /api/v1/staff/documents/${userExternalId}/dossier`.
    - Left panel: Multi-asset viewer with Pan/Zoom (`0.5x` to `3x`), 90° rotation, and photo tabs (`front`, `back`, `full`, `selfie`, `proof`).
    - Right panel: Biometric verification gauge with InsightFace ArcFace (`buffalo_l`) cosine score, OCR vs Registration comparison table (Name, Number, Mother name, Birth date, City/UF), and rejection reason input.
    - Fast operator keyboard shortcuts: `A` (Approve RG), `S` (Approve Selfie), `R` (Reject with reason input focus), `G` (Rotate 90°), `+`/`-` (Zoom), `Esc` (Close modal).
    - Decisions dispatched to `POST /api/v1/staff/documents/${userExternalId}/decide`.
- **Shared UI & Document Components in `@v7m/ui`**:
  - `packages/ui/src/components/duty-status-card.tsx`: Exports `DutyStatusCard`, `DocumentHubGrid`, and `DocumentItem` supporting 6 lifecycle states (`empty`, `analyzing`, `needs_action`, `needs_kinship`, `review`, `approved`) and in-app modal document viewer (`GET`) for PDF/Image preview with download link.
  - `packages/ui/src/components/address-proof-capture.tsx`: Exports `AddressProofCapture` supporting zero-manual typing, automatic OCR extraction, and one-touch kinship / landlord selection (`DEFAULT_KINSHIP_OPTIONS`: family vs housing categories).
  - `apps/admin/src/app/dev-preview/documents/page.tsx`: Complete live preview showcasing the 6-item promoter folder and 8-item student academic folder.

### 1.2 Test Infrastructure & Multi-App Configurations
- **Root Orchestration & Scripts**:
  - `package.json` at root defines canonical scripts: `pnpm test`, `pnpm test:e2e` (`turbo run test:e2e`), `pnpm check-types` (`turbo run check-types`), `pnpm lint` (`turbo run lint`).
- **`tooling/qa-audit` Suite**:
  - Contains 9 automated test modules (`01-happy-paths.mjs`, `02-input-adversarial.mjs`, `03-network-resilience.mjs`, `04-navigation-session.mjs`, `05-webhooks-concurrency.mjs`, `06-backend-log-auditor.mjs`, `07-cross-monolith-lifecycle.mjs`, `08-accessibility-a11y.mjs`, `09-extreme-resolutions.mjs`).
  - Executed via `pnpm --filter @v7m/qa-audit run audit` (`node run-all-audit.mjs`), outputting structured summaries to `reports/qa-audit-consolidated.json` and `reports/qa-audit-final-consolidated.md`.
- **Playwright Configuration Matrix**:
  | App | Playwright Config Path | Port (Dev / E2E) | Test Directory | WebServer / Mock Backend |
  | :--- | :--- | :--- | :--- | :--- |
  | `apps/admin` | `apps/admin/playwright.config.ts` | `3003` / `3109` | `apps/admin/tests/e2e` | Next.js dev server (`PORT=3109`); browser mock helper `helpers/mock-api.ts` |
  | `apps/app-promotor` | `apps/app-promotor/playwright.config.ts` | `3001` / `3107` | `apps/app-promotor/tests/e2e` | Next.js dev server (`PORT=3107`) + Mock Backend (`PORT=8765`, `mock-backend.mjs`) |
  | `apps/app-supletivo` | `apps/app-supletivo/playwright.config.ts` | `3020->3000` / `3108` | `apps/app-supletivo/tests/e2e` | Next.js dev server (`PORT=3108`) with warmup setup project |

---

## 2. Logic Chain

1. **Live Status Icon Indicators (`DutyIconBadge` & `DutyMiniPill`) in `apps/admin`**:
   - `packages/ui` already encapsulates status definitions and icons. Creating reactive badge components (`DutyIconBadge` and `DutyMiniPill`) in `@v7m/ui` enables instant reusability across all 3 frontends.
   - In `apps/admin/src/components/ui/app-header.tsx` and `DashboardHeader`, integrating an aggregate `DutyIconBadge` provides instant visibility of the global review queue backlog.
   - In `StudentsManagerTab`, `MatriculasPage`, `AlunosPage`, and `PromotersManagerTab`, replacing or augmenting static `StatusPill` components with `DutyMiniPill` / `DutyIconBadge` displays exact document statuses (`empty`, `analyzing`, `needs_kinship`, `needs_action`, `review`, `approved`).
   - Clicking on any badge dispatches an event/action that opens the Document Dossier modal (`openDossier`) or navigates to `/documentos?user=<id>`.

2. **Document Inspector Modal (GET) Requirements in `apps/admin`**:
   - Reusable modal in `@v7m/ui` / `apps/admin`:
     - Secure GET rendering: Embedded PDF iframe or responsive Image.
     - Controls: Interactive Pan/Zoom (`0.5x` to `3.0x`), 90° clockwise rotation (`↻ Girar 90°`), and 1-click reset (`100%`).
     - Actions: Download button (`target="_blank" download`), full-screen external link, and close trigger.
     - Security/Compliance: Display document metadata (OCR extracted summary, SHA-256 digital signature hash, verification timestamp).

3. **Dual Persona Architecture Enforcement**:
   - **Promoter (6 items)**: `identity` (accepts RG or CNH), `selfie` (biometric liveness), `address` (AddressProofCapture with kinship), `pix` (bank key), `school_history` (school declaration), `contract` (Promoter Partnership Agreement).
   - **Student (8 items)**: `identity` (RG only; CNH strictly rejected with regulatory explanation), `selfie`, `address` (AddressProofCapture with kinship), `school_history` (prior academic transcript), `civil_certificate` (birth/marriage cert), `voter_card` (electoral clearance), `military_certificate` (for male students), `contract` (EJA Enrollment Agreement).

4. **Multi-App E2E Test Suite Architecture**:
   - **`apps/app-supletivo/tests/e2e/document-hub.spec.ts`**:
     - Test 1: Live badge rendering in dashboard and enrollment header.
     - Test 2: Clicking badge opens Resolution Hub drawer.
     - Test 3: Real-time CNH vs RG enforcement (attempting CNH upload displays regulatory error; uploading RG passes to `analyzing` / `approved`).
     - Test 4: `AddressProofCapture` OCR flow & third-party kinship selection (transitions from `needs_kinship` to `approved`).
     - Test 5: Digital Contract Signing module (captures signature, records timestamp + IP seal, transitions to `approved`).
     - Test 6: In-app GET Document Inspector Modal (renders preview, tests zoom controls, and tests download link).
   - **`apps/app-promotor/tests/e2e/document-hub.spec.ts`**:
     - Test 1: Promoter dashboard checklist rendering with `DutyIconBadge` and `DutyMiniPill`.
     - Test 2: 6-item folder resolution (CNH/RG acceptance, selfie liveness, PIX ownership, partnership contract signing).
     - Test 3: In-app document viewer for approved files.
   - **`apps/admin/tests/e2e/document-inspector.spec.ts`**:
     - Test 1: Review queue rendering and category filters.
     - Test 2: Table `DutyMiniPill` click -> opens Dual-View Dossier Modal.
     - Test 3: Image viewer zoom, rotation, tab switching, and OCR data panel.
     - Test 4: Rapid decision hotkeys (`A`, `S`, `R`) and decision persistence.
     - Test 5: Direct GET inspection modal for approved student/promoter documents.
   - **`tooling/qa-audit` Integration**:
     - Add document hub lifecycle assertion to `07-cross-monolith-lifecycle.mjs` and accessibility checks to `08-accessibility-a11y.mjs`.

---

## 3. Caveats

1. **Mocking vs Live OCR in Tests**:
   - Playwright E2E tests use deterministic route interception (`page.route`) and `mock-backend.mjs` to simulate OCR responses, kinship transitions, and biometric scores without relying on external API quota or latency.
2. **Regulatory Student Constraints**:
   - MEC / CEE regulations strictly disallow CNH for educational enrollment; RG / CIN is mandatory. Frontend validation must immediately block CNH files before backend submission with clear user guidance.
3. **Staff Permissions**:
   - `apps/admin` document review and decision endpoints require superuser / staff JWT credentials, already handled in tests via `injectStaffSession(page)`.

---

## 4. Conclusion

- `apps/admin` already possesses an operational Review Desk (`/documentos`) and can seamlessly integrate `DutyIconBadge` and `DutyMiniPill` into its headers and list tables (`StudentsManagerTab`, `MatriculasPage`, `AlunosPage`, `LeadsManagerTab`).
- The Document Inspector Modal (GET) with preview (PDF/Image), zoom, rotation, and download links can be standardized in `@v7m/ui` and utilized across all three frontend applications.
- The Playwright and `qa-audit` infrastructure is fully configured and ready for the multi-app E2E test suite covering all visual, interactive, and technical acceptance criteria specified in `ORIGINAL_REQUEST.md`.

---

## 5. Verification Method

To independently verify the survey findings and ensure test execution capability:

1. **Verify Workspace Type Integrity**:
   ```bash
   pnpm turbo run check-types
   ```
2. **Verify Workspace Lint Compliance**:
   ```bash
   pnpm turbo run lint
   ```
3. **Execute Admin E2E Tests**:
   ```bash
   pnpm --filter @v7m/admin test:e2e
   ```
4. **Execute App-Promotor E2E Tests**:
   ```bash
   pnpm --filter @v7m/app-promotor test:e2e
   ```
5. **Execute App-Supletivo E2E Tests**:
   ```bash
   pnpm --filter @v7m/app-supletivo test:e2e
   ```
6. **Execute Full QA-Audit Master Loop**:
   ```bash
   pnpm --filter @v7m/qa-audit run audit
   ```
