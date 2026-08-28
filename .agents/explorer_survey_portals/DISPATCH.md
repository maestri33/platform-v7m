## 2026-08-28T04:26:58Z

You are an Explorer performing the Phase 0 Survey for the Document Hub and Live Status Indicator system.
Your working directory is: c:\Users\maestri33\dev\v7m\.agents\explorer_survey_portals
Authoritative request file: c:\Users\maestri33\dev\v7m\.agents\ORIGINAL_REQUEST.md

Your mission:
1. Thoroughly explore `apps/app-promotor` and `apps/app-supletivo`:
   - Explore existing route structures (App Router in Next.js 16), layout files, header/navigation components, dashboards, and existing `/documentos` or onboarding/cadastral pages.
   - Check how document state and uploads are currently managed (React Query, Zustand, React Context, API routes, Server Actions, or mock state).
   - Investigate the Dual Persona requirements:
     * Promoter 6-item folder: identity (RG or CNH), selfie (biometrics), address (AddressProofCapture with kinship), pix, school_history, contract (Promoter Partnership Agreement).
     * Student 8-item regulatory academic folder: identity (RG only strictly enforced), selfie, address, school_history, civil_certificate, voter_card, military_certificate, contract (Student EJA Enrollment Contract).
   - Check how clicking a status badge should link/open the resolution drawer or `/documentos` route with focus on that specific document.
2. Write a comprehensive survey report to `c:\Users\maestri33\dev\v7m\.agents\explorer_survey_portals\handoff.md`.
3. Update `c:\Users\maestri33\dev\v7m\.agents\explorer_survey_portals\progress.md` with your status.
4. Send a message to parent (id: f7eb88c2-2a0e-4074-8ff8-af7660be31a9) with a summary when finished.
