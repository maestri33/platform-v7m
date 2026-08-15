import type { AnalysisStatus } from "@/lib/api/types";

const MAP: Record<AnalysisStatus, { cls: string; m: string; f: string }> = {
  approved: { cls: "banner-ok", m: "Aprovado", f: "Aprovada" },
  rejected: { cls: "banner-danger", m: "Reprovado", f: "Reprovada" },
  review: { cls: "banner-warn", m: "Em revisão", f: "Em revisão" },
  pending: { cls: "banner-info", m: "Analisando…", f: "Analisando…" },
};

/**
 * Banner do estado de análise por IA (selfie/documento), tom para superfície
 * clara. `subject="f"` usa a flexão feminina (selfie aprovada/reprovada).
 */
export function StatusBanner({
  status,
  reason,
  footnote,
  subject = "m",
}: {
  status: AnalysisStatus;
  reason?: string | null;
  footnote?: string | null;
  subject?: "m" | "f";
}) {
  const entry = MAP[status] ?? MAP.pending;
  const label = subject === "f" ? entry.f : entry.m;
  return (
    <div className={`banner ${entry.cls}`} role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        {status === "pending" && <span className="spinner" aria-hidden />}
        <p className="font-display">{label}</p>
      </div>
      {footnote && <p className="text-xs mt-1 opacity-70">{footnote}</p>}
      {reason && <p className="text-sm mt-2 opacity-90">{reason}</p>}
    </div>
  );
}
