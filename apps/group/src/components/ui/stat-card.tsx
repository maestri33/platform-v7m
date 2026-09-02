import type { ReactNode, ComponentType } from "react";

type Tone = "neutral" | "green" | "blue" | "amber" | "danger";

const TONE: Record<Tone, { ring: string; value: string; chip: string; iconBg: string }> = {
  neutral: {
    ring: "border-brand-border",
    value: "text-brand-ink",
    chip: "bg-brand-bg text-brand-muted",
    iconBg: "bg-slate-100 text-slate-600",
  },
  green: {
    ring: "border-brand-green/30",
    value: "text-brand-green-dark",
    chip: "bg-brand-green-bg text-brand-green-dark",
    iconBg: "bg-brand-green-bg text-brand-green-dark",
  },
  blue: {
    ring: "border-brand-blue-bright/30",
    value: "text-brand-blue",
    chip: "bg-brand-blue-bg text-brand-blue",
    iconBg: "bg-brand-blue-bg text-brand-blue",
  },
  amber: {
    ring: "border-brand-amber/30",
    value: "text-brand-amber",
    chip: "bg-brand-amber-bg text-brand-amber",
    iconBg: "bg-brand-amber-bg text-brand-amber",
  },
  danger: {
    ring: "border-brand-danger/30",
    value: "text-brand-danger",
    chip: "bg-brand-danger-bg text-brand-danger",
    iconBg: "bg-brand-danger-bg text-brand-danger",
  },
};

export interface StatCardProps {
  /** Rótulo curto em maiúsculas (ex.: "Saldo Asaas"). */
  label: string;
  /** Valor grande (ex.: "R$ 1.234,56", "12", "OK"). */
  value: ReactNode;
  /** Linha de apoio sob o valor (ex.: "atualizado agora"). */
  hint?: ReactNode;
  /** Alias para hint */
  sublabel?: ReactNode;
  tone?: Tone;
  /** Etiqueta no canto (ex.: status "suficiente"). */
  chip?: string;
  /** Ícone decorativo opcional */
  icon?: ComponentType<{ className?: string }>;
}

export function StatCard({
  label,
  value,
  hint,
  sublabel,
  tone = "neutral",
  chip,
  icon: Icon,
}: StatCardProps) {
  const t = TONE[tone] || TONE.neutral;
  const helperText = hint || sublabel;

  return (
    <div
      className={`card-in flex flex-col justify-between gap-2 rounded-2xl border bg-white/70 p-4 shadow-2xs backdrop-blur-md transition ${t.ring}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-muted">
          {label}
        </span>
        {Icon ? (
          <div className={`flex size-7 items-center justify-center rounded-lg p-1.5 ${t.iconBg}`}>
            <Icon className="size-4" />
          </div>
        ) : chip ? (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${t.chip}`}>{chip}</span>
        ) : null}
      </div>
      <div>
        <span className={`text-2xl font-extrabold tracking-tight ${t.value}`}>{value}</span>
        {helperText ? <p className="text-[13px] text-brand-muted mt-0.5">{helperText}</p> : null}
      </div>
    </div>
  );
}
