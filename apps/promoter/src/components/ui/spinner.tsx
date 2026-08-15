/** Spinner inline (feedback em ações assíncronas > 300ms). */
export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`spinner ${className}`.trim()} aria-hidden />;
}
