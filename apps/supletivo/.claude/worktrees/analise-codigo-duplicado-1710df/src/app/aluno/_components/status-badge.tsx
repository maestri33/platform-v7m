import type { ValidationStatus } from "@/lib/api";

type StatusKey = ValidationStatus | "na" | "not_applicable";

interface StatusBadgeProps {
  status: StatusKey | null;
  reason?: string | null;
}

/**
 * Pílula compacta que comunica o estado de validação de um documento. As cores
 * seguem a paleta brand: green (aprovado), blue com spinner (analisando), ink
 * (revisão humana), danger (reprovado), neutral (nunca enviado / não se aplica).
 */
export function StatusBadge({ status, reason }: StatusBadgeProps) {
  const config = describe(status);
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[12px] font-bold ${config.tone}`}
      >
        {config.icon}
        {config.label}
      </span>
      {status === "rejected" && reason ? (
        <p className="text-[12px] font-semibold leading-snug text-brand-danger">{reason}</p>
      ) : null}
    </div>
  );
}

function describe(status: StatusKey | null): {
  label: string;
  tone: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case "approved":
      return {
        label: "Validado",
        tone: "bg-brand-green-bg text-brand-green-dark",
        icon: <CheckIcon />,
      };
    case "pending":
      return {
        label: "Em análise",
        tone: "bg-brand-blue-bg text-brand-blue",
        icon: <Spinner />,
      };
    case "review":
      return {
        label: "Em revisão",
        tone: "bg-brand-yellow/15 text-brand-ink",
        icon: <Hourglass />,
      };
    case "rejected":
      return {
        label: "Reprovado",
        tone: "bg-brand-danger-bg text-brand-danger",
        icon: <CrossIcon />,
      };
    case "not_applicable":
      return {
        label: "Não se aplica",
        tone: "bg-brand-bg text-brand-muted",
        icon: <DashIcon />,
      };
    case "na":
    case null:
    default:
      return {
        label: "Pendente",
        tone: "bg-brand-bg text-brand-muted",
        icon: <UploadIcon />,
      };
  }
}

function CheckIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function DashIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 12h12" />
    </svg>
  );
}
function Hourglass() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 2h12M6 22h12M7 2v4a5 5 0 0 0 10 0V2M7 22v-4a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v13M6 9l6-6 6 6M4 21h16" />
    </svg>
  );
}
function Spinner() {
  return (
    <span aria-hidden className="block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
