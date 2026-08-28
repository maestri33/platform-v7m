# Phase 0 Survey Report: Document Hub & Live Status Indicator System (UI Architecture)

**Author:** UI Explorer Subagent  
**Working Directory:** `c:\Users\maestri33\dev\v7m\.agents\explorer_survey_ui`  
**Timestamp:** `2026-08-28T04:30:00Z`  
**Integrity Mode:** Development  

---

## 1. Observation

Direct code examination and tool executions across `packages/ui`, `packages/api-client`, `apps/admin`, `apps/app-promotor`, `apps/app-supletivo`, and `apps/hub` revealed the following exact facts and structures:

### 1.1 `@v7m/ui` Package Analysis
- **Package Configuration** (`packages/ui/package.json`):
  - **Version**: `0.1.0-alpha.1`, ESM module (`"type": "module"`).
  - **Main / Types**: `./src/index.ts`.
  - **Exports**:
    - `"."` -> `./src/index.ts`
    - `"./tokens"` -> `./src/tokens/index.css`
    - `"./themes/supletivo"` -> `./src/themes/supletivo.css`
    - `"./themes/staff"` -> `./src/themes/staff.css`
    - `"./components"` -> `./src/components/index.ts`
    - `"./components/*"` -> `./src/components/*`
  - **Dependencies**: `clsx` (`^2.1.1`), `lucide-react` (`^1.33.0`), `react-webcam` (`^7.2.0`), `tailwind-merge` (`^3.6.0`).
  - **Dev/Peer Dependencies**: `react` (`19.2.4`), `react-dom` (`19.2.4`), `next` (`16.3.1`), `typescript` (`^5`). Note: `@radix-ui` primitives are installed in apps (`apps/admin`, `apps/hub`) but not in `packages/ui/package.json`.
  - **Scripts**: `"check-types": "tsc --noEmit"`.

- **Existing Components in `packages/ui/src/components/`**:
  1. `duty-status-card.tsx` (Lines 1–457):
     - Contains `DutyStatusCard`, `DocumentHubGrid`.
     - Types defined: `DocumentTypeKey` (`identity | selfie | address | pix | school_history | civil_certificate | voter_card | military_certificate | contract`), `DocumentStatus` (`empty | analyzing | needs_action | needs_kinship | review | approved`), `DocumentItem`, `DutyStatusCardProps`, `DocumentHubGridProps`.
     - Icon map `DOCUMENT_ICONS`: `FileText`, `Camera`, `MapPin`, `KeyRound`, `GraduationCap`, `Scroll`, `Vote`, `ShieldAlert`, `Award`.
     - In-app preview modal `[GET]` with PDF `<iframe>` and Image rendering, download link, close button.
  2. `address-proof-capture.tsx` (Lines 1–568):
     - Contains `AddressProofCapture`.
     - Types defined: `AddressData` (`zipcode`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`), `ExtractedProofData` (`file_url`, `file_name`, `mime_type`, `holder_name`, `is_own_name`, `matched_parent`, `kinship_provided`, `address`), `AddressProofStep` (`empty | analyzing | error | needs_kinship | satisfied`), `KinshipOption`.
     - Contains 8 pre-configured kinship chips (`DEFAULT_KINSHIP_OPTIONS`: `conjuge`, `irmao`, `filho`, `avo`, `outro_familiar`, `aluguel_locador`, `colega_quarto`, `pensao`).
     - Live OCR loading phase simulation (`"Enviando..."`, `"Executando OCR..."`, `"Extraindo dados..."`).
     - In-app document preview modal for address proof.
  3. `camera-capture.tsx` (Lines 1–209):
     - Contains `CameraCapture` utilizing `react-webcam` (width 1280, height 720).
     - Guide modes: `"face"` (circular/oval face outline with `-translate-x-1/2 -translate-y-1/2 rounded-[50%]` and dark vignette `shadow-[0_0_0_2000px_rgba(11,27,59,0.40)]`) and `"document"` (dashed rounded-2xl bounding box).
     - Camera flip toggle (front `"user"` vs rear `"environment"`), canvas screenshot capture to `File` (image/jpeg), and fallback gallery file upload input (`type="file" accept="image/*"`).
  4. `icon-badge.tsx` (Lines 1–20):
     - Decorative brand badge with gradient and pulse animation (`size-16 rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue-bright text-white`).
  5. Other existing primitives: `button.tsx` (polymorphic CTA), `card.tsx`, `text-field.tsx`, `select-field.tsx`, `stepper.tsx`, `file-upload.tsx`, `otp-input.tsx`, `error-box.tsx`, `loading-overlay.tsx`, `diploma-flag.tsx`, `turnstile-widget.tsx`, `wizard-footer.tsx`, `platform-credentials.tsx`, `wispr-text.tsx`, `site-footer.tsx`, `conditional-footer.tsx`.

### 1.2 Monorepo App Implementations & Relevant Code
- **`apps/admin`**:
  - `apps/admin/src/app/(app)/documentos/page.tsx` (Lines 1–533):
    - "Mesa de Conferência de Documentos & Biometria".
    - Dual-view comparator with Pan/Zoom (`+`/`-`), Rotation (`↻ Girar 90°`), keyboard shortcuts (`A` = Aprova RG, `S` = Aprova Selfie, `R` = Reprova com justificativa, `G` = Girar, `Esc` = Fechar).
    - Biometrics comparator displaying InsightFace / ArcFace `buffalo_l` cosine similarity score (`Number(dossier.biometrics.verifications[0].score).toFixed(3)`).
  - `apps/admin/src/app/dev-preview/documents/page.tsx` (Lines 1–315):
    - Live showcase demo of `DocumentHubGrid` toggling between Promoter (6 items) and Student (8 items) folders.
- **`apps/app-supletivo`**:
  - `apps/app-supletivo/src/app/matricula/contract-reveal.tsx` (Lines 1–192):
    - Sticky scroll reveal contract signing UI. Scroll progress (`progress > 0.9`) unlocks acceptance button. Diploma graphic scales dynamically via `requestAnimationFrame`.
  - `apps/app-supletivo/src/app/matricula/kinship-chat.tsx` (Lines 1–126):
    - Kinship relation selector with prompt chips ("Mãe", "Pai", "Cônjuge", "Aluguel / Locador", etc.) and custom textarea.
  - `apps/app-supletivo/src/app/matricula/step-rg.tsx`:
    - Strict RG-only validation (rejects CNH explicitly as per MEC regulatory guidelines).
- **`apps/app-promotor`**:
  - `apps/app-promotor/src/app/(app)/selfie/AgreementSheet.tsx` (Lines 1–88):
    - Promoter partnership agreement sheet with accessible focus trap cycling before selfie capture.
  - `apps/app-promotor/src/app/(app)/endereco/AddressProofSection.tsx` (Lines 1–147):
    - Live integration with backend route `/api/me/document/address-proof` and `/api/me/document/address-proof/kinship`.
  - `apps/app-promotor/src/components/layout/AppNav.tsx` (Lines 1–60):
    - Navigation bar with 4 bottom tabs.
- **`apps/hub`**:
  - `apps/hub/src/components/ui/status-pill.tsx` (Lines 1–65):
    - Status mapping helper for lead and candidate stages.

### 1.3 Baseline Quality Commands
- `pnpm turbo run check-types`: **Exited with code 0** across all 12 packages (8 TS packages).
- `pnpm --filter @v7m/ui check-types`: **Exited with code 0**.
- `pnpm turbo run lint`: Note that while `@v7m/app-promotor`, `@v7m/app-supletivo`, and `@v7m/hub` passed with 0 errors, `apps/admin` failed because `apps/admin/eslint.config.mjs` was missing `playwright-report/**` in `globalIgnores()`, causing ESLint to scan thousands of minified Playwright trace HTML/JS artifacts. Ignoring `playwright-report/**` resolves the admin lint run.

---

## 2. Logic Chain

From these observations, we deduce the following technical findings and required architecture:

### 2.1 Component Gap Analysis & Refactoring Plan

| Component Requested | Current Status | Required Action / Specification |
|---|---|---|
| **`DutyIconBadge`** | ❌ Missing as a standalone interactive badge | **Create in `@v7m/ui`**: Compact reactive status badge for table rows, cockpit cards, navigation headers, and student lists. Renders specific document icon with reactive status indicator ring/dot in 6 states. On click triggers navigation or opens `DocumentResolutionDrawer` / `DocumentInspectorModal`. Sizes: `sm` (24px), `md` (32px), `lg` (40px). |
| **`DutyMiniPill`** | ❌ Missing in `@v7m/ui` (partial in `apps/hub/status-pill`) | **Create in `@v7m/ui`**: Micro pill badge with status dot indicator and localized text label. Supports compact (`text-[10px]`) and standard (`text-xs`) sizes across all 6 lifecycle states. |
| **`AddressProofCapture`** | 🟡 Present in `packages/ui` (568 lines) | **Refactor & Align**: Unify state types to the standard 6-state machine (`empty`, `analyzing`, `needs_kinship`, `needs_action`, `review`, `approved`). Ensure seamless callback handling for OCR extraction and kinship confirmation. |
| **`ContractSigner`** | 🟡 Scattered across `contract-reveal.tsx` and `AgreementSheet.tsx` | **Create Unified in `@v7m/ui`**: Unified dual-mode contract signer supporting Promoter Partnership Terms (R$ 100 commission, weekly Friday closing, IP/timestamp seal) and Student EJA Contract (MEC clauses, sticky scroll unlock, digital timestamp + biometrics seal). |
| **`BiometricsLivenessCapture`** | 🟡 Basic camera in `camera-capture.tsx` | **Create in `@v7m/ui`**: Enhance `CameraCapture` into a specialized liveness biometrics component with oval facial overlay, lighting guidance, live score animation (InsightFace / ArcFace compatibility), camera flipping, and fallback gallery upload. |
| **`DocumentResolutionDrawer`** | ❌ Missing in `@v7m/ui` | **Create in `@v7m/ui`**: Accessible slide-over drawer / bottom sheet where users resolve pending actions without leaving their current screen. Dynamically swaps sub-views: RG/CNH upload, biometrics selfie, address proof capture, kinship confirmation, contract signing, or file replacement. |
| **`DocumentInspectorModal`** | 🟡 Embedded inside `DutyStatusCard` / `AddressProofCapture` | **Extract & Elevate in `@v7m/ui`**: Standalone modal `[GET]` with Pan/Zoom controls (`+`/`-`), 90° rotation, PDF viewer (`<iframe>`/`<embed>`), high-res image zoom, extracted metadata panel, and secure download action. |

---

### 2.2 Unified 6-Lifecycle State Machine Mapping

The table below defines the authoritative color tokens, icons, labels, and interactions across the design system:

```
+---------------------------------------------------------------------------------------------------------------+
|  State              | Visual / Dark Classes                       | Lucide Icon    | Label (PT-BR)     | Click Action    |
+---------------------+---------------------------------------------+----------------+-------------------+-----------------+
| 1. empty (⚪)        | border-slate-700 bg-slate-800 text-slate-300| UploadCloud    | "Pendente"        | Open Resolution |
| 2. analyzing (🔵)    | border-blue-500/40 bg-blue-500/10 (pulse)   | Loader2 (spin) | "Lendo (OCR)..."  | Open Resolution |
| 3. needs_kinship (🟡)| border-amber-500/40 bg-amber-500/10 text-amb | Users          | "Vínculo Pendente"| Open Kinship    |
| 4. needs_action (🔴) | border-red-500/40 bg-red-500/10 text-red-400| AlertTriangle  | "Ajuste Necessário"| Open Resolution |
| 5. review (🟠)       | border-amber-400/40 bg-amber-400/10 text-amb| Clock          | "Em Análise"      | Open Resolution |
| 6. approved (🟢)     | border-emerald-500/40 bg-emerald-500/10 em-4| CheckCircle2   | "Verificado ✓"    | Open Inspector  |
+---------------------------------------------------------------------------------------------------------------+
```

---

### 2.3 Dual Persona Folder Architecture

#### 1. Promoter Persona (`"promoter"`) — 6 Document Slots
1. **`identity`** (`civil`): RG or CNH accepted. Front + Back or Open Full photo.
2. **`selfie`** (`biometric`): Live selfie matching document with liveness verification.
3. **`address`** (`address`): Utility bill (water, power, gas, internet) within 90 days. Auto-OCR + 1-touch kinship confirmation if third-party.
4. **`pix`** (`finance`): PIX key validation in promoter's name for weekly Friday payouts.
5. **`school_history`** (`academic`): High school diploma / schooling proof for cadastral records.
6. **`contract`** (`legal`): Partnership & Affiliate Agreement (R$ 100 per enrolled student + weekly bonuses). Digital acceptance + IP/timestamp seal.

#### 2. Student Persona (`"student"`) — 8 Regulatory Document Slots (MEC / SISTEC / CEE)
1. **`identity`** (`civil`): **Strictly RG / CIN only** (CNH is strictly rejected per MEC guidelines).
2. **`selfie`** (`biometric`): Official student dossier photo & liveness verification.
3. **`address`** (`address`): Proof of residence for regional polo assignment.
4. **`school_history`** (`academic`): Previous school records / transcript for academic subject exemption.
5. **`civil_certificate`** (`civil`): Birth or Marriage Certificate (Certidão de Nascimento/Casamento).
6. **`voter_card`** (`civil`): Título de Eleitor & Quitação Eleitoral (mandatory for graduation).
7. **`military_certificate`** (`civil`): Certificado de Reservista / CDI (mandatory for male students 18–45 years).
8. **`contract`** (`legal`): EJA EAD Educational Contract with terms reading and digital signature.

---

### 2.4 Authoritative TypeScript Definitions

The following types should be exported by `@v7m/ui` and referenced by all frontend applications:

```typescript
export type PersonaType = "promoter" | "student";

export type DocumentTypeKey =
  | "identity"
  | "selfie"
  | "address"
  | "pix"
  | "school_history"
  | "civil_certificate"
  | "voter_card"
  | "military_certificate"
  | "contract";

export type DocumentStatus =
  | "empty"
  | "analyzing"
  | "needs_kinship"
  | "needs_action"
  | "review"
  | "approved";

export type KinshipType =
  | "conjuge"
  | "irmao"
  | "filho"
  | "avo"
  | "outro_familiar"
  | "aluguel_locador"
  | "colega_quarto"
  | "pensao";

export interface AddressData {
  zipcode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface ContractSignature {
  accepted: boolean;
  signedAt: string; // ISO 8601
  ipAddress?: string | null;
  userAgent?: string | null;
  signatureHash?: string | null;
  contractVersion?: string | null;
}

export interface DocumentItem {
  id: DocumentTypeKey;
  title: string;
  category: "civil" | "biometric" | "address" | "finance" | "academic" | "legal";
  description: string;
  status: DocumentStatus;
  statusLabel?: string;
  extractedInfo?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  reason?: string | null;
  kinshipHolder?: string | null;
  kinshipRelation?: KinshipType | string | null;
  addressData?: AddressData | null;
  signature?: ContractSignature | null;
  biometricScore?: number | null;
  allowedAudiences: PersonaType[];
  updatedAt?: string | null;
}
```

---

## 3. Caveats

1. **Camera API & Permissions**: `react-webcam` requires `https://` or `localhost` context with explicit browser media permissions. In environments where camera is blocked or not available, the fallback file input (`capture="user"` on mobile, gallery picker on desktop) must always remain visible and accessible.
2. **PDF Preview Rendering**: Native `<iframe>` PDF rendering can vary between desktop browsers and mobile webviews (iOS Safari restricts some embedded iframe controls). For mobile devices, providing direct download and "Abrir em tela cheia" link alongside the preview ensures complete coverage.
3. **Radix Primitives**: `@radix-ui/react-dialog` is used in `apps/admin` and `apps/hub`. When building dialogs/drawers in `@v7m/ui`, we can either implement zero-dependency accessible dialogs (matching `duty-status-card.tsx` and `AgreementSheet.tsx` focus traps) or include `@radix-ui/react-dialog` as a dependency if needed.
4. **Admin ESLint Global Ignores**: `apps/admin/eslint.config.mjs` currently lacks `"playwright-report/**"` and `"test-results/**"` in `globalIgnores()`. Adding them ensures `pnpm turbo run lint` passes across all 12 monorepo packages.

---

## 4. Conclusion

- `@v7m/ui` already contains the robust foundations (`DutyStatusCard`, `DocumentHubGrid`, `AddressProofCapture`, `CameraCapture`).
- To fulfill the R1–R3 requirements of the authoritative request, the following additions/refactors in `@v7m/ui` and apps are needed:
  1. **`packages/ui/src/components/duty-icon-badge.tsx`**: Add `DutyIconBadge` component with 6 status states, sizes (`sm`, `md`, `lg`), and click-to-resolve support.
  2. **`packages/ui/src/components/duty-mini-pill.tsx`**: Add `DutyMiniPill` component with dot indicator and state label.
  3. **`packages/ui/src/components/contract-signer.tsx`**: Add unified `ContractSigner` supporting both Promoter & Student agreements with scroll-unlock and digital seal.
  4. **`packages/ui/src/components/biometrics-liveness-capture.tsx`**: Add `BiometricsLivenessCapture` with facial guide and liveness score UI.
  5. **`packages/ui/src/components/document-resolution-drawer.tsx`**: Add `DocumentResolutionDrawer` for seamless in-place document action resolution.
  6. **`packages/ui/src/components/document-inspector-modal.tsx`**: Add `DocumentInspectorModal` with zoom, pan, rotation, preview, and download.
  7. **`packages/ui/src/index.ts`**: Re-export all newly created components.
  8. **Monorepo Routes**: Provide `/documentos` resolution routes and embed `DutyIconBadge` / `DutyMiniPill` in headers, tables, and cockpits.

---

## 5. Verification Method

To independently verify the facts and code state documented in this survey:

1. **Verify TypeScript Compilation**:
   ```bash
   pnpm --filter @v7m/ui check-types
   pnpm turbo run check-types
   ```
   *Expected result*: Exit code 0, 0 type errors across all workspaces.

2. **Verify Code Quality & Linting**:
   ```bash
   pnpm turbo run lint
   ```
   *Expected result*: Exit code 0, 0 lint errors across all workspaces.

3. **Verify UI Showcase in Admin**:
   Inspect `apps/admin/src/app/dev-preview/documents/page.tsx` and run:
   ```bash
   pnpm --filter @v7m/admin build
   ```
   *Expected result*: Builds standalone Next.js 16 application with 0 errors.

4. **Invalidation Conditions**:
   - Any renaming of status states that breaks the 6-state contract (`empty`, `analyzing`, `needs_kinship`, `needs_action`, `review`, `approved`).
   - Allowing CNH uploads for the Student persona (strictly RG-only regulatory requirement).
