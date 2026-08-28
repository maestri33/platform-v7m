## 2026-08-28T04:26:58Z
You are an Explorer performing the Phase 0 Survey for the Document Hub and Live Status Indicator system.
Your working directory is: c:\Users\maestri33\dev\v7m\.agents\explorer_survey_ui
Authoritative request file: c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md

Your mission:
1. Thoroughly explore `packages/ui` (and `packages/api-client` if relevant):
   - Look at existing UI components (badges, pills, modals, drawers, buttons, forms, tooltips, lucide-react icons, radix-ui primitives).
   - Look for any existing document-related components, address inputs, biometrics/selfie capture, contract signing, or document viewers.
   - Check package.json dependencies, exports in `packages/ui/src/index.ts` (or equivalent), styling/Tailwind configs, and build scripts.
2. Identify:
   - What components already exist vs what needs to be created or refactored for `DutyIconBadge`, `DutyMiniPill`, `AddressProofCapture`, `ContractSigner`, `BiometricsLivenessCapture`, `DocumentResolutionDrawer`, `DocumentInspectorModal`.
   - The exact color/icon mappings for the 6 lifecycle states: empty (⚪), analyzing (🔵), needs_kinship (🟡), needs_action/rejected (🔴), review (🟠), approved/satisfied (🟢).
   - Exact TypeScript types needed for DocumentItem, DocumentType, DocumentStatus, PersonaType (promoter vs student), KinshipType, ContractSignature.
3. Write a comprehensive survey report to `c:\Users\maestri33\dev\v7m\.agents\explorer_survey_ui\handoff.md`.
4. Update `c:\Users\maestri33\dev\v7m\.agents\explorer_survey_ui\progress.md` with your status.
5. Send a message to parent (id: f7eb88c2-2a0e-4074-8ff8-af7660be31a9) with a summary when finished.
