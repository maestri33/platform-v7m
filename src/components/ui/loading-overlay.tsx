"use client";

interface LoadingOverlayProps {
  show: boolean;
}

/** Full-screen blurred backdrop with a centered spinner, shown while an action is in flight. */
export function LoadingOverlay({ show }: LoadingOverlayProps) {
  if (!show) return null;
  return (
    <div
      aria-live="polite"
      aria-label="Carregando"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/30 backdrop-blur-sm"
    >
      <span className="size-12 animate-spin rounded-full border-4 border-white border-t-brand-green" />
    </div>
  );
}
