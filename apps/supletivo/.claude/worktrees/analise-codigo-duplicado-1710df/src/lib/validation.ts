/**
 * Validation status strings shared by the enrollment wizard (Fase 1) and the
 * student document flow (Fase 3). Anything that means "the AI/coordinator has
 * reached a verdict — stop polling."
 */
export const SETTLED_STATUSES = new Set(["approved", "rejected", "review"]);

export function isSettledStatus(status: string | null | undefined): boolean {
  return SETTLED_STATUSES.has(status ?? "");
}
