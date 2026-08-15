import type { CandidateStatus } from "@/lib/api/types";

/** Etapas do funil do candidato, na ordem do backend. */
const FUNNEL_STEPS = [
  { key: "documents", label: "Documento" },
  { key: "address", label: "Comprovante" },
  { key: "pix", label: "Pix" },
  { key: "education", label: "Escolaridade" },
  { key: "selfie", label: "Selfie" },
] as const;

type StepKey = (typeof FUNNEL_STEPS)[number]["key"];

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" aria-hidden>
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Indicador de progresso do funil (recomendação ui-ux-pro-max para o padrão
 * "Funnel"). `current` é a etapa visual, independente do status legado do backend.
 */
export function FunnelStepper({ current }: { current: StepKey | CandidateStatus }) {
  const normalized = current === "started" || current === "profile" ? "documents" : current;
  // `completed` = funil inteiro concluído → tudo marcado como feito.
  const idx =
    normalized === "completed"
      ? FUNNEL_STEPS.length
      : FUNNEL_STEPS.findIndex((s) => s.key === normalized);
  return (
    <nav className="stepper" aria-label="Progresso do cadastro">
      {FUNNEL_STEPS.map((s, i) => {
        const state = idx < 0 ? "todo" : i < idx ? "done" : i === idx ? "current" : "todo";
        return (
          <span
            key={s.key}
            className="step"
            data-state={state}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="step-dot">{state === "done" ? <CheckIcon /> : i + 1}</span>
            {s.label}
          </span>
        );
      })}
    </nav>
  );
}
