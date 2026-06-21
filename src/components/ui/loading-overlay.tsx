"use client";

import { useEffect, useState } from "react";

interface LoadingOverlayProps {
  show: boolean;
}

/** Frases bem-humoradas que entram quando a espera se arrasta (o "loop" de polling). */
const SLOW_MESSAGES = [
  "Calma que já vai… o servidor foi tomar um cafezinho ☕",
  "Ainda no forno — segura aí que sai quentinho 🔥",
  "Quase lá! Obrigado pela paciência 💚💛",
];

const SLOW_AFTER_MS = 6000;
const ROTATE_MS = 4000;

/** Full-screen blurred backdrop: brand wordmark + flag bars + spinner. */
export function LoadingOverlay({ show }: LoadingOverlayProps) {
  const [slow, setSlow] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!show) {
      setSlow(false);
      setIdx(0);
      return;
    }
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [show]);

  useEffect(() => {
    if (!slow) return;
    const r = setInterval(() => setIdx((i) => (i + 1) % SLOW_MESSAGES.length), ROTATE_MS);
    return () => clearInterval(r);
  }, [slow]);

  if (!show) return null;
  return (
    <div
      aria-live="polite"
      aria-label="Carregando"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-brand-ink/45 backdrop-blur-md"
    >
      <div className="flex flex-col items-center gap-3">
        <span className="text-3xl font-extrabold tracking-tight text-white">
          Supletivo <span className="text-brand-green">Brasil</span>
        </span>
        <div className="flex gap-1.5">
          <span className="h-1.5 w-7 rounded-full bg-brand-green" />
          <span className="h-1.5 w-7 rounded-full bg-brand-yellow" />
          <span className="h-1.5 w-7 rounded-full bg-brand-blue-bright" />
        </div>
      </div>

      <span className="size-12 animate-spin rounded-full border-4 border-white/40 border-t-brand-green" />

      {slow ? (
        <p className="max-w-xs px-6 text-center text-sm font-semibold leading-relaxed text-white/90">
          {SLOW_MESSAGES[idx]}
        </p>
      ) : null}
    </div>
  );
}
