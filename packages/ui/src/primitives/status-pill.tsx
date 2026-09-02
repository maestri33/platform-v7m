type Tone = "neutral" | "green" | "blue" | "amber" | "danger";

/**
 * Mapa status (texto livre do backend) → tom + rótulo amigável.
 */
const STATUS_TONE: Record<string, Tone> = {
  // pagamentos / comissões / payouts
  paid: "green",
  processed: "green",
  done: "green",
  success: "green",
  completed: "green",
  pending: "amber",
  processing: "blue",
  queued: "blue",
  failed: "danger",
  error: "danger",
  canceled: "neutral",
  cancelled: "neutral",
  // matrícula / aluno
  active: "green",
  in_progress: "blue",
  new: "amber",
  matriculado: "green",
  pre_matriculado: "blue",
  lead: "amber",
  approved: "green",
  released: "green",
  veteran: "green",
  rejected: "danger",
  review: "amber",
  awaiting_documents: "amber",
  documents_under_review: "blue",
};

const LABEL: Record<string, string> = {
  active: "Ativo",
  in_progress: "Em curso",
  new: "Novo",
  matriculado: "Matriculado",
  pre_matriculado: "Pré-matriculado",
  lead: "Lead",
  paid: "Pago",
  processed: "Processado",
  pending: "Pendente",
  processing: "Processando",
  queued: "Na fila",
  failed: "Falhou",
  error: "Erro",
  canceled: "Cancelado",
  cancelled: "Cancelado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  review: "Em análise",
  released: "Liberado",
  done: "Concluído",
  success: "Sucesso",
  completed: "Concluído",
};

const CLS: Record<Tone, string> = {
  neutral: "bg-brand-bg text-brand-muted ring-brand-border",
  green: "bg-brand-green-bg text-brand-green-dark ring-brand-green/30",
  blue: "bg-brand-blue-bg text-brand-blue ring-brand-blue-bright/30",
  amber: "bg-brand-amber-bg text-brand-amber ring-brand-amber/30",
  danger: "bg-brand-danger-bg text-brand-danger ring-brand-danger/30",
};

function prettify(s: string): string {
  return s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export interface StatusPillProps {
  status: string | null | undefined;
  /** Força um tom (ignora o mapa). */
  tone?: Tone;
  /** Texto custom (ignora o LABEL). */
  label?: string;
  className?: string;
}

export function StatusPill({ status, tone, label, className = "" }: StatusPillProps) {
  const key = (status ?? "").toLowerCase();
  const resolvedTone = tone ?? STATUS_TONE[key] ?? "neutral";
  const text = label ?? LABEL[key] ?? (status ? prettify(status) : "—");
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-bold ring-1 ring-inset ${CLS[resolvedTone]} ${className}`}
    >
      {text}
    </span>
  );
}
