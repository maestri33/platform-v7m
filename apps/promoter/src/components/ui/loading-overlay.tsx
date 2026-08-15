"use client";

// Overlay de loading global (não-auth): blur + anel dourado (+ logo opcional).
// Reusa as classes .auth-overlay/.auth-ring de globals.css — o AuthOverlay
// específico da auth continua no AuthShell. Renderize condicionalmente
// (ex.: `{pending && <LoadingOverlay />}`) em transições de rota / submits longos.
// prefers-reduced-motion: coberto pelo kill-switch global de movimento (globals.css).

type Props = {
  /** Texto anunciado por leitores de tela. */
  label?: string;
  /** Mostra a logo com "respiração" sutil no centro do anel. */
  logo?: boolean;
};

export function LoadingOverlay({ label = "Carregando…", logo = false }: Props) {
  return (
    <div className="auth-overlay" role="status" aria-label={label}>
      <div className="overlay-mark">
        <div className="auth-ring" aria-hidden />
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.svg" alt="" aria-hidden className="overlay-logo" />
        )}
      </div>
    </div>
  );
}
