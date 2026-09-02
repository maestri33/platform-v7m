import { ApiError, getErrorMessage } from "@/lib/api";

export interface StepProps {
  /** Advance. Pass the server's new status when a mutation returns it (no re-fetch). */
  onDone: (status?: string) => void;
  /** State machine mismatch — parent jumps to the section the server expects. */
  onWrongStatus: (expected: string) => void;
  /** Liga o véu de carregamento da página; o rótulo diz o que está rolando. */
  setBusy: (b: boolean, label?: string) => void;
  busy: boolean;
  /** @deprecated fluxo 100% in-card — mantido opcional por compatibilidade */
  setFooter?: (buttons: unknown[]) => void;
}

/** Shared submit error handling: state-machine errors route, the rest render inline. */
export function handleStepError(
  e: unknown,
  onWrongStatus: (expected: string) => void,
  setError: (m: string | null) => void,
) {
  if (e instanceof ApiError && e.expectedStatus) {
    onWrongStatus(e.expectedStatus);
    return;
  }
  setError(getErrorMessage(e));
}

/* "União estável" fora: não é estado civil (regime jurídico ≠ estado civil). */
export const MARITAL_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
];
