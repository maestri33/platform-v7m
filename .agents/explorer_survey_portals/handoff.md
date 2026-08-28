# Phase 0 Survey Report: Portals Architecture for Document Hub & Live Status Indicator System

**Author:** Explorer Subagent (Portals Survey)  
**Working Directory:** `c:\Users\maestri33\dev\v7m\.agents\explorer_survey_portals`  
**Target Applications:** `apps/app-promotor` & `apps/app-supletivo` (with cross-cutting integration in `apps/admin`, `apps/hub`, and `@v7m/ui`)  
**Timestamp:** `2026-08-28T04:35:00Z`  
**Integrity Mode:** Development  

---

## 1. Observation

Direct code examination and structural analysis across `apps/app-promotor` and `apps/app-supletivo` revealed the following exact technical facts:

### 1.1 `apps/app-promotor` (Portal do Promotor / Afiliados)
- **Framework & Runtime**: Next.js 16.3.1 (App Router), React 19, standalone output.
- **Route & Layout Architecture**:
  - Root layout: `src/app/layout.tsx` (Global fonts, theme provider, toasts).
  - App group layout: `src/app/(app)/layout.tsx` (Lines 1–26):
    - Reads session via `readSession()` from cookie `v7m_access_token`.
    - Enforces gate with `isOutsider(session.roles)` -> `<OutsideApp />` redirect for student/outsider accounts.
    - Wraps children in `<AppShell session={session}>`.
  - App Shell: `src/components/layout/AppShell.tsx` (Lines 1–66):
    - Fixed top header with Logo (`/logo.svg`), DEV mode link, `<ThemeToggle />`, and user name (`session.name`).
    - Scrollable viewport container `<main id="main" className="flex-1 app-scroll px-[var(--gutter)] py-5">`.
    - Bottom navigation `<AppNav />`.
  - Navigation Component: `src/components/layout/AppNav.tsx` (Lines 1–60):
    - 4 main navigation tabs: `/painel` (Início, `Home`), `/leads` (Leads, `Users`), `/comissoes` (Comissões, `DollarSign`), `/conta` (Conta, `UserCircle`).
  - Dashboard Page: `src/app/(app)/painel/page.tsx` (Lines 1–353):
    - Fetches `/api/v1/collaborators/candidate/me`, `/promoter/me`, `/promoter/me/summary`, `/promoter/me/commissions`.
    - Renders onboarding checklist ("Liberação de Saques - X de 5 deveres cumpridos") evaluated by `getFunnelChecklist(candidateMe)` in `src/lib/candidate/funnel.ts`.
  - Current Step Pages (Dispersed):
    - `src/app/(app)/documento/page.tsx` & `DocForm.tsx` (1 de 5 deveres - RG/CNH upload).
    - `src/app/(app)/endereco/page.tsx` & `AddressProofSection.tsx` (2 de 5 deveres - Comprovante de residência & parentesco).
    - `src/app/(app)/pix/page.tsx` & `PixForm.tsx` (3 de 5 deveres - Chave Pix para saque).
    - `src/app/(app)/escolaridade/page.tsx` & `EscolaridadeForm.tsx` (4 de 5 deveres - Escolaridade & histórico).
    - `src/app/(app)/selfie/page.tsx`, `SelfieForm.tsx` & `AgreementSheet.tsx` (5 de 5 deveres - Selfie biometria + termo de parceria).
  - API Proxy Routes (`src/app/api/`):
    - `me/document/photo/route.ts` -> proxies to `/api/v1/collaborators/candidate/documents/photo/{slot}` (`rg_front`, `rg_back`, `rg_full`, `cnh_front`, `cnh_back`, `cnh_full`).
    - `me/document/address-proof/route.ts` -> proxies to `/api/v1/collaborators/candidate/documents/address-proof`.
    - `me/document/address-proof/kinship/route.ts` -> proxies to `/api/v1/collaborators/candidate/documents/address-proof/kinship`.
    - `me/document/classify/route.ts` -> proxies to `/api/v1/collaborators/candidate/documents/classify`.
    - `me/selfie/route.ts` -> proxies to `/api/v1/collaborators/candidate/selfie`.
    - `me/pix/route.ts` -> proxies to `/api/v1/collaborators/candidate/pix`.
    - `me/education/route.ts` -> proxies to `/api/v1/collaborators/candidate/education`.
    - `me/media/route.ts` -> authenticated media proxy stream for verified documents (`src` query parameter).
- **State Management**:
  - Server-side auth and data fetching with `djangoFetch` and session cookie `v7m_access_token`.
  - Client transitions with `useTransition`, `useRouter`, and `useSWR` (polling selfie status with exponential backoff).

---

### 1.2 `apps/app-supletivo` (Portal do Aluno & Matrícula)
- **Framework & Runtime**: Next.js 16.3.1 (App Router), React 19, standalone output.
- **Route & Layout Architecture**:
  - Root layout: `src/app/layout.tsx` (Global styles, session synchronization).
  - Funnel group: `src/app/(funil)/layout.tsx` with sticky top `<AppHeader />` (`src/components/ui/app-header.tsx`).
  - Enrollment Wizard Route: `src/app/matricula/page.tsx` (Lines 1–329):
    - Steps: `StepRg`, `StepAddress`, `StepEducation`, `StepSelfie`, `AwaitingRelease`.
    - Subcomponents:
      * `src/app/matricula/step-rg.tsx`: Enforces strict RG-only upload (`classifyVerdict(c, "student")` rejects CNH with `reject_cnh` modal).
      * `src/app/matricula/step-address.tsx`: Proof-first address flow with OCR extraction and `KinshipChat` (`src/app/matricula/kinship-chat.tsx`).
      * `src/app/matricula/step-selfie.tsx`: Selfie biometrics and liveness verification.
      * `src/app/matricula/contract-reveal.tsx`: EJA Enrollment Contract with sticky scroll reveal unlock (`progress > 0.9`).
  - Student Academic Dashboard Route: `src/app/aluno/page.tsx` (Lines 1–227):
    - Renders academic folder document cards (`_components/document-card.tsx`), status badges (`_components/status-badge.tsx`), and bottom-sheet upload (`_components/document-upload-sheet.tsx`).
    - Handled document types: `certificate`, `transcript`, `address_proof`, `id_card`, `birth_certificate`, `military`.
    - Blood type field: `_components/blood-type-field.tsx` (required after all documents approved to release exams `/provas`).
- **State Management**:
  - Client-side token storage in `src/lib/session.ts` (`localStorage` key `v7m_token` with access/refresh JWTs).
  - Reactive sync with `useSyncExternalStore(subscribeStorage, getAccessToken, getServerAccessToken)`.
  - Direct backend client `src/lib/api.ts` communicating with `API_BASE_URL` (`http://127.0.0.1:8001`) with automatic silent token refresh mutex (`refreshAuthTokens`).

---

### 1.3 Dual Persona Folder Mapping Requirements

| Persona | Document ID | Category | Title | Backend Endpoint & Requirements |
|---|---|---|---|---|
| **Promoter** (6 items) | `identity` | `civil` | Documento Oficial (RG ou CNH) | `POST /candidate/documents/photo/{slot}` (accepts both RG and CNH) |
| | `selfie` | `biometric` | Selfie com Biometria Facial | `POST /candidate/selfie` (liveness + face match against document) |
| | `address` | `address` | Comprovante de Residência | `POST /candidate/documents/address-proof` & `/kinship` |
| | `pix` | `finance` | Chave Pix para Repasses | `POST /candidate/pix` (DICT lookup on promoter's CPF) |
| | `school_history` | `academic` | Escolaridade / Histórico | `POST /candidate/education` (Level, completed, year, city, school) |
| | `contract` | `legal` | Termo de Parceria do Promotor | `GET /contract/current` (R$ 100/lead commission, digital timestamp seal) |
| **Student** (8 items) | `identity` | `civil` | Carteira de Identidade (RG/CIN) | `POST /enrollment/documents/rg/photo/{slot}` (**Strictly RG only**, CNH rejected) |
| | `selfie` | `biometric` | Foto Oficial do Aluno (Selfie) | `POST /enrollment/selfie` (Biometric validation & academic file photo) |
| | `address` | `address` | Comprovante de Residência | `POST /enrollment/address/proof` & `/kinship` |
| | `school_history` | `academic` | Histórico Escolar Anterior | `POST /student/documents/transcript` |
| | `civil_certificate` | `civil` | Certidão de Nascimento / Casamento | `POST /student/documents/birth_certificate` |
| | `voter_card` | `civil` | Título de Eleitor & Quitação | `POST /student/documents/certificate` / `voter_card` |
| | `military_certificate` | `civil` | Certificado de Reservista (Militar) | `POST /student/documents/military` (Conditional on male gender 18–45) |
| | `contract` | `legal` | Contrato de Matrícula EJA EAD | `GET /contract/current` (Sticky scroll read, digital signature hash + IP) |

---

## 2. Logic Chain

Based on the direct code observations, we deduce the step-by-step architecture needed to deliver the unified Document Hub & Live Status Indicator system:

### 2.1 Navigation Header & Live Status Icon Indicators (`DutyIconBadge` & `DutyMiniPill`)
1. **Top Header & Cockpit Integration**:
   - In `apps/app-promotor/src/components/layout/AppShell.tsx`: embed the reactive `DutyIconBadge` / `DutyMiniPill` in the header bar next to user status.
   - In `apps/app-supletivo/src/components/ui/app-header.tsx`: embed `DutyMiniPill` showing overall document status.
   - In `apps/admin` (`AppHeader`, `/alunos`, `/coordenadores`) and `apps/hub` (`HubHeader`, `/candidatos`, `/alunos`): embed `DutyIconBadge` in candidate/student rows and cockpit summaries.
2. **6 Lifecycle States Visual Contract**:
   - `empty` (⚪ / slate-700): Not yet uploaded -> Click opens resolution drawer in upload mode.
   - `analyzing` (🔵 / blue pulse): OCR / AI extraction in flight -> Click opens resolution drawer with progress feedback.
   - `needs_kinship` (🟡 / amber-500): Third-party utility bill detected -> Click opens resolution drawer with kinship selector.
   - `needs_action` / `rejected` (🔴 / red-500): Rejection or unreadable file -> Click opens resolution drawer with specific retry instructions.
   - `review` (🟠 / amber-400): Manual review at regional polo -> Click opens drawer with review notice.
   - `approved` / `satisfied` (🟢 / emerald-500): Fully validated -> Click opens `DocumentInspectorModal` `[GET]` with zoom, preview, and download.

### 2.2 Dedicated Resolution Hub Route & Drawer (`/documentos` & `DocumentResolutionDrawer`)
1. **Dedicated Route (`/documentos`)**:
   - `apps/app-promotor/src/app/(app)/documentos/page.tsx`: Complete 6-item folder view using `DocumentHubGrid` and `DutyStatusCard`.
   - `apps/app-supletivo/src/app/aluno/documentos/page.tsx` (or enhanced `/aluno`): Complete 8-item regulatory academic folder.
2. **Resolution Drawer Component (`DocumentResolutionDrawer`)**:
   - Can be triggered from any `DutyIconBadge` or `DutyMiniPill` anywhere in the app without full page departure.
   - Accepts `targetDocument?: DocumentTypeKey` prop to automatically focus and mount the appropriate sub-form:
     * Identity document upload with real-time RG vs CNH validation.
     * `AddressProofCapture` with OCR and kinship chips.
     * `BiometricsLivenessCapture` with camera guide overlay and score meter.
     * `ContractSigner` with scroll-reveal and 1-touch signature.
     * `DocumentInspectorModal` for approved documents.

### 2.3 CNH vs RG Strict Regulatory Enforcement
- In `apps/app-supletivo`, the student persona is subject to MEC / CEE / SISTEC regulations requiring RG (Registro Geral) or CIN (Carteira de Identidade Nacional) for official diploma registration. CNH is strictly rejected by `classifyVerdict(c, "student")` returning `{ kind: "reject_cnh" }` which triggers the instructive modal.
- In `apps/app-promotor`, the promoter is an autonomous commercial partner under Brazilian civil law (Código Civil). Both RG and CNH are valid forms of identity identification (`classifyVerdict(c, "promoter")` accepts both).

---

## 3. Caveats

1. **Camera API & Permissions in WebViews**: Mobile browsers and embedded webviews (e.g. WhatsApp in-app browser) may block `navigator.mediaDevices.getUserMedia`. The `BiometricsLivenessCapture` / `CameraCapture` component must always offer a visible fallback file input (`capture="user"` on mobile).
2. **Session Storage vs Cookie Synchronization**: `apps/app-promotor` uses server-side cookies (`v7m_access_token`) with SSR layout authentication, whereas `apps/app-supletivo` uses client-side `localStorage` (`v7m_token`) with `useSyncExternalStore`. All shared components from `@v7m/ui` must remain storage-agnostic by accepting pure data props and callback functions.
3. **PDF Preview on Mobile**: Mobile iOS Safari does not support interactive PDF zoom inside standard `<iframe>`. The `DocumentInspectorModal` must provide an explicit "Baixar Arquivo" / "Abrir em tela cheia" link alongside the embed.

---

## 4. Conclusion

The monorepo frontends (`apps/app-promotor`, `apps/app-supletivo`, `apps/admin`, `apps/hub`) and `@v7m/ui` possess a mature foundation. The roadmap for complete execution includes:

1. **In `@v7m/ui`**:
   - Implement `DutyIconBadge`, `DutyMiniPill`, `DocumentResolutionDrawer`, `DocumentInspectorModal`, `ContractSigner`, and `BiometricsLivenessCapture`.
   - Re-export all components in `packages/ui/src/index.ts`.
2. **In `apps/app-promotor`**:
   - Provide `/documentos` route rendering the 6-item folder (`identity`, `selfie`, `address`, `pix`, `school_history`, `contract`).
   - Add `DutyIconBadge` / `DutyMiniPill` to `AppShell` header and `AppNav` / dashboard.
3. **In `apps/app-supletivo`**:
   - Provide `/documentos` / enhanced `/aluno` route rendering the 8-item regulatory folder.
   - Add `DutyMiniPill` to `AppHeader` and link to the resolution drawer.
4. **In `apps/admin` & `apps/hub`**:
   - Integrate `DutyIconBadge` in candidate and student table lists.

---

## 5. Verification Method

To independently verify the facts and route structures documented in this survey:

1. **Verify TypeScript Compilation**:
   ```bash
   pnpm turbo run check-types
   ```
   *Expected output*: 0 errors across all workspaces.

2. **Verify Code Linting**:
   ```bash
   pnpm turbo run lint
   ```
   *Expected output*: 0 errors.

3. **Verify Build of Frontend Applications**:
   ```bash
   pnpm turbo run build --filter=@v7m/app-promotor --filter=@v7m/app-supletivo --filter=@v7m/admin --filter=@v7m/ui
   ```
   *Expected output*: Successful build artifacts generated.

4. **Verify Playwright End-to-End Test Suite**:
   ```bash
   npx playwright test
   ```
