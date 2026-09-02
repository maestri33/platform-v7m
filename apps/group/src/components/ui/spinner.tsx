/** Spinner inline + tela de carregamento centrada. Sem libs — só Tailwind. */

interface SpinnerProps {
  /** Tamanho em utilitário Tailwind (default size-8). */
  className?: string;
}

export function Spinner({ className = "size-8" }: SpinnerProps) {
  return (
    <span
      aria-hidden
      className={`${className} animate-spin rounded-full border-[3px] border-brand-border border-t-brand-blue`}
    />
  );
}

/** Estado de carregamento de uma seção: spinner + frase, centrado. */
export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <div
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
    >
      <Spinner className="size-9" />
      <p className="text-[14px] font-semibold text-brand-muted">{label}</p>
    </div>
  );
}

/** Estado vazio: ícone neutro + mensagem. */
export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-border bg-white/50 py-14 text-center">
      <svg
        aria-hidden
        className="size-9 text-brand-border"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 4v16" />
      </svg>
      <p className="text-[14px] font-semibold text-brand-muted">{label}</p>
    </div>
  );
}
