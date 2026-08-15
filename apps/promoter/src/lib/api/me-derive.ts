/**
 * Funções PURAS de derivação `candidate/me` → `MeResponse.steps`.
 *
 * Separadas de `me.ts` (que tem `"server-only"`) para serem testáveis fora
 * do runtime do Next.js. Quando o back disponibilizar o `GET /me` unificado,
 * o `me.ts` lê `me.candidate.steps` direto e este módulo vira dead code —
 * até lá, é a fonte da derivação client-side do fallback legado.
 *
 * Regra derivada do contrato em `.reviews/api-spec-me-unificado.md`,
 * seção "Regras de `candidate.steps[].done` e `status`".
 */
import type {
  CandidateMe,
  MeCandidate,
  OnboardingStep,
  OnboardingSteps,
  StepStatus,
} from "./types";

export function candidateToMeCandidate(c: CandidateMe): MeCandidate {
  const documents = deriveDocuments(c);
  const address = deriveAddress(c);
  const pix = derivePix(c);
  const education = deriveEducation(c);
  const selfie = deriveSelfie(c);

  const steps: OnboardingSteps = { documents, address, pix, education, selfie };
  const onboarding_complete =
    documents.done && address.done && pix.done && education.done && selfie.done;

  return {
    status: c.status,
    approved_at: null,
    rejected_at: null,
    rejection_reason: null,
    onboarding_complete,
    steps,
    // Espelha o WhatsApp do polo (vem em selfie.hub_whatsapp) p/ o alerta de
    // hold oferecer contato humano de 1 toque.
    hub_whatsapp: c.selfie?.hub_whatsapp ?? null,
  };
}

export function deriveDocuments(c: CandidateMe): OnboardingStep {
  const rg = c.documents?.rg;
  const cnh = c.documents?.cnh;
  const slot = rg ?? cnh ?? null;
  if (!slot) return { done: false, status: null, reason: null };
  const status = (slot.validation_status ?? null) as StepStatus;
  const done = status === "approved";
  return {
    done,
    status,
    reason: done ? null : reasonOf(slot, status),
  };
}

export function deriveAddress(c: CandidateMe): OnboardingStep {
  const proof = c.address_proof;
  if (!proof) return { done: false, status: null, reason: null };
  const status = proof.status as StepStatus;
  const done = status === "approved";
  return {
    done,
    status,
    reason: done ? null : proof.reason ?? null,
  };
}

export function derivePix(c: CandidateMe): OnboardingStep {
  if (c.pix_validated === true) {
    return { done: true, status: "approved", reason: null };
  }
  return { done: false, status: null, reason: null };
}

export function deriveEducation(c: CandidateMe): OnboardingStep {
  const p = c.profile;
  if (!p) return { done: false, status: null, reason: null };
  const hasLevel = Boolean(p.education_level);
  const hasStatus = Boolean(p.education_status);
  const done = hasLevel && hasStatus;
  return {
    done,
    status: done ? "approved" : null,
    reason: null,
  };
}

export function deriveSelfie(c: CandidateMe): OnboardingStep {
  const s = c.selfie;
  if (!s?.taken_at) return { done: false, status: null, reason: null };
  const status = (s.analysis_status ?? "pending") as StepStatus;
  const done = status === "approved";
  return {
    done,
    status,
    reason: done ? null : s.analysis_reason ?? null,
  };
}

/** Conta quantas etapas ainda estão pendentes (não-done). */
export function pendingSteps(steps: OnboardingSteps): number {
  return [steps.documents, steps.address, steps.pix, steps.education, steps.selfie]
    .filter((s) => !s.done).length;
}

/** Heurística de reason: prioriza o `analysis_reason` se existir. */
function reasonOf(
  slot: { validation_status?: string | null; [k: string]: unknown } & Record<string, unknown>,
  status: StepStatus,
): string | null {
  if (status !== "rejected") return null;
  // DocumentSlot aceita campos arbitrários; alguns backends expõem o motivo
  // em `analysis_reason` ou similar.
  const r =
    (slot as { analysis_reason?: string | null }).analysis_reason ??
    (slot as { reason?: string | null }).reason ??
    null;
  return r;
}
