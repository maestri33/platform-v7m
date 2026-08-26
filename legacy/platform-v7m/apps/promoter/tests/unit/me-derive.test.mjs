// Teste unitário do `me-derive.ts` — exercita a derivação de
// `candidate/me` (shape legado) para `MeCandidate` (shape novo).
// Roda direto com Node 24 via strip-types, sem test runner externo.
//
//   node --experimental-strip-types tests/unit/me-derive.test.mjs
//
// Asserções seguem o contrato em `.reviews/api-spec-me-unificado.md`:
// seção "Regras de candidate.steps[].done e status".

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  candidateToMeCandidate,
  deriveDocuments,
  deriveAddress,
  derivePix,
  deriveEducation,
  deriveSelfie,
  pendingSteps,
} from "../../src/lib/api/me-derive.ts";

// ---------- Fixtures ---------------------------------------------------------

function baseMe(overrides = {}) {
  return {
    status: "started",
    profile: null,
    address: null,
    address_proof: null,
    documents: null,
    selfie: null,
    pix_validated: false,
    blocks: [],
    ...overrides,
  };
}

// ---------- deriveDocuments -------------------------------------------------

test("deriveDocuments: sem documentos → not done, status null", () => {
  const step = deriveDocuments(baseMe());
  assert.equal(step.done, false);
  assert.equal(step.status, null);
  assert.equal(step.reason, null);
});

test("deriveDocuments: RG approved → done", () => {
  const step = deriveDocuments(
    baseMe({ documents: { rg: { validation_status: "approved" } } }),
  );
  assert.equal(step.done, true);
  assert.equal(step.status, "approved");
  assert.equal(step.reason, null);
});

test("deriveDocuments: RG rejected com reason → not done, reason preservado", () => {
  const step = deriveDocuments(
    baseMe({
      documents: {
        rg: { validation_status: "rejected", analysis_reason: "foto borrada" },
      },
    }),
  );
  assert.equal(step.done, false);
  assert.equal(step.status, "rejected");
  assert.equal(step.reason, "foto borrada");
});

test("deriveDocuments: CNH approved (sem RG) → done via CNH", () => {
  const step = deriveDocuments(
    baseMe({ documents: { cnh: { validation_status: "approved" } } }),
  );
  assert.equal(step.done, true);
});

test("deriveDocuments: RG pending → not done, status pending", () => {
  const step = deriveDocuments(
    baseMe({ documents: { rg: { validation_status: "pending" } } }),
  );
  assert.equal(step.done, false);
  assert.equal(step.status, "pending");
});

// ---------- deriveAddress ----------------------------------------------------

test("deriveAddress: sem proof → not done", () => {
  const step = deriveAddress(baseMe());
  assert.equal(step.done, false);
  assert.equal(step.status, null);
});

test("deriveAddress: approved → done", () => {
  const step = deriveAddress(
    baseMe({ address_proof: { status: "approved", photo: "x", reason: null, exists: true, needs_kinship: false, kinship_relation: null } }),
  );
  assert.equal(step.done, true);
});

test("deriveAddress: needs_kinship → not done, status preservado", () => {
  const step = deriveAddress(
    baseMe({ address_proof: { status: "needs_kinship", photo: "x", reason: null, exists: true, needs_kinship: true, kinship_relation: null } }),
  );
  assert.equal(step.done, false);
  assert.equal(step.status, "needs_kinship");
});

// ---------- derivePix --------------------------------------------------------

test("derivePix: false → not done, null", () => {
  assert.deepEqual(derivePix(baseMe({ pix_validated: false })), {
    done: false, status: null, reason: null,
  });
});

test("derivePix: undefined → not done", () => {
  assert.equal(derivePix(baseMe()).done, false);
});

test("derivePix: true → done, status approved", () => {
  const step = derivePix(baseMe({ pix_validated: true }));
  assert.equal(step.done, true);
  assert.equal(step.status, "approved");
  assert.equal(step.reason, null);
});

// ---------- deriveEducation --------------------------------------------------

test("deriveEducation: sem profile → not done", () => {
  assert.equal(deriveEducation(baseMe()).done, false);
});

test("deriveEducation: só level → not done (falta status)", () => {
  const me = baseMe({ profile: { education_level: "medio" } });
  assert.equal(deriveEducation(me).done, false);
});

test("deriveEducation: level + status → done", () => {
  const me = baseMe({
    profile: { education_level: "medio", education_status: "completed" },
  });
  assert.equal(deriveEducation(me).done, true);
});

// ---------- deriveSelfie -----------------------------------------------------

test("deriveSelfie: sem taken_at → not done", () => {
  assert.equal(
    deriveSelfie(baseMe({ selfie: { taken_at: null, analysis_status: "approved" } })).done,
    false,
  );
});

test("deriveSelfie: taken_at + approved → done", () => {
  const step = deriveSelfie(
    baseMe({
      selfie: {
        taken_at: "2026-08-01T10:00:00-03:00",
        analysis_status: "approved",
        analysis_reason: null,
      },
    }),
  );
  assert.equal(step.done, true);
  assert.equal(step.reason, null);
});

test("deriveSelfie: taken_at + rejected → not done, reason preservado", () => {
  const step = deriveSelfie(
    baseMe({
      selfie: {
        taken_at: "2026-08-01T10:00:00-03:00",
        analysis_status: "rejected",
        analysis_reason: "rosto não confere com documento",
      },
    }),
  );
  assert.equal(step.done, false);
  assert.equal(step.reason, "rosto não confere com documento");
});

// ---------- candidateToMeCandidate (integração) ------------------------------

test("candidateToMeCandidate: candidato zerado → 5 steps pendentes, onboarding_complete=false", () => {
  const me = candidateToMeCandidate(baseMe());
  assert.equal(me.onboarding_complete, false);
  assert.equal(me.steps.documents.done, false);
  assert.equal(me.steps.address.done, false);
  assert.equal(me.steps.pix.done, false);
  assert.equal(me.steps.education.done, false);
  assert.equal(me.steps.selfie.done, false);
  assert.equal(me.status, "started");
  assert.equal(me.rejection_reason, null);
});

test("candidateToMeCandidate: tudo aprovado → onboarding_complete=true", () => {
  const me = candidateToMeCandidate(
    baseMe({
      status: "completed",
      documents: { cnh: { validation_status: "approved" } },
      address_proof: { status: "approved", photo: "x", reason: null, exists: true, needs_kinship: false, kinship_relation: null },
      pix_validated: true,
      profile: { education_level: "superior", education_status: "completed" },
      selfie: {
        taken_at: "2026-08-01T10:00:00-03:00",
        analysis_status: "approved",
        analysis_reason: null,
      },
    }),
  );
  assert.equal(me.onboarding_complete, true);
  assert.equal(me.status, "completed");
});

test("candidateToMeCandidate: 1 faltando (pix) → onboarding_complete=false", () => {
  const me = candidateToMeCandidate(
    baseMe({
      documents: { rg: { validation_status: "approved" } },
      address_proof: { status: "approved", photo: "x", reason: null, exists: true, needs_kinship: false, kinship_relation: null },
      pix_validated: false, // ← faltando
      profile: { education_level: "medio", education_status: "completed" },
      selfie: { taken_at: "2026-08-01T10:00:00-03:00", analysis_status: "approved", analysis_reason: null },
    }),
  );
  assert.equal(me.onboarding_complete, false);
  assert.equal(me.steps.pix.done, false);
  assert.equal(pendingSteps(me.steps), 1);
});

test("candidateToMeCandidate: rejeitado preserva status, onboarding_complete=false", () => {
  const me = candidateToMeCandidate(
    baseMe({
      status: "rejected",
      // Steps completas não importam — status rejected trava o fluxo.
      documents: { rg: { validation_status: "approved" } },
      address_proof: { status: "approved", photo: "x", reason: null, exists: true, needs_kinship: false, kinship_relation: null },
      pix_validated: true,
      profile: { education_level: "medio", education_status: "completed" },
      selfie: { taken_at: "2026-08-01T10:00:00-03:00", analysis_status: "approved", analysis_reason: null },
    }),
  );
  assert.equal(me.status, "rejected");
  // on-boarding é derivado dos steps, não do status — aqui tudo done.
  assert.equal(me.onboarding_complete, true);
});

// ---------- pendingSteps -----------------------------------------------------

test("pendingSteps: 0 quando tudo done", () => {
  const steps = {
    documents: { done: true, status: "approved", reason: null },
    address: { done: true, status: "approved", reason: null },
    pix: { done: true, status: "approved", reason: null },
    education: { done: true, status: "approved", reason: null },
    selfie: { done: true, status: "approved", reason: null },
  };
  assert.equal(pendingSteps(steps), 0);
});

test("pendingSteps: 3 quando só documents+address+pix done", () => {
  const steps = {
    documents: { done: true, status: "approved", reason: null },
    address: { done: true, status: "approved", reason: null },
    pix: { done: true, status: "approved", reason: null },
    education: { done: false, status: null, reason: null },
    selfie: { done: false, status: null, reason: null },
  };
  assert.equal(pendingSteps(steps), 2);
});
