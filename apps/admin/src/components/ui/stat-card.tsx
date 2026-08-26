import type { ReactNode } from "react";

type Tone = "neutral" | "green" | "blue" | "amber" | "danger";

const TONE: Record<Tone, { ring: string; value: string; chip: string }> = {
  neutral: { ring: "border-brand-border", value: "text-brand-ink", chip: "bg-brand-bg text-brand-muted" },
  green: { ring: "border-brand-green/30", value: "text-brand-green-dark", chip: "bg-brand-green-bg text-brand-green-dark" },
  blue: { ring: "border-brand-blue-bright/30", value: "text-brand-blue", chip: "bg-brand-blue-bg text-brand-blue" },
  amber: { ring: "border-brand-amber/30", value: "text-brand-amber", chip: "bg-brand-amber-bg text-brand-amber" },
  danger: { ring: "border-brand-danger/30", value: "text-brand-danger", chip: "bg-brand-danger-bg text-brand-danger" },
};

interface StatCardProps {
  /** Rótulo curto em maiúsculas (ex.: "Saldo Asaas"). */
  label: string;
  /** Valor grande (ex.: "R$ 1.234,56", "12", "OK"). */
  value: ReactNode;
  /** Linha de apoio sob o valor (ex.: "atualizado agora"). */
  hint?: ReactNode;
  tone?: Tone;
  /** Etiqueta no canto (ex.: status "suficiente"). */
  chip?: string;
}

/**
 * Cartão de métrica do cockpit — "liquid glass" claro com valor em destaque.
 * Usado em fileira no dashboard (saldo, fechamento, sistema) e nos resumos
 * financeiros. `tone` colore o valor/chip; `chip` é uma etiqueta opcional.
 */
export function StatCard({ label, value, hint, tone = "neutral", chip }: StatCardProps) {
  const t = TONE[tone];
  return (
    <div
      className={`card-in flex flex-col gap-1 rounded-2xl border bg-white/70 p-4 shadow-sm backdrop-blur-md ${t.ring}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-muted">
          {label}
        </span>
        {chip ? (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${t.chip}`}>{chip}</span>
        ) : null}
      </div>
      <span className={`text-2xl font-extrabold tracking-tight ${t.value}`}>{value}</span>
      {hint ? <span className="text-[13px] text-brand-muted">{hint}</span> : null}
    </div>
  );
}
