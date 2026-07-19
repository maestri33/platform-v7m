"use client";

import { useEffect, useState } from "react";

import { DiplomaFlag } from "@/components/ui/diploma-flag";

interface LoadingOverlayProps {
  show: boolean;
  /** Mensagem imediata do que está rolando ("Verificando seu número…") — a pessoa nunca fica perdida. */
  message?: string;
}

/** Frases bem-humoradas que entram quando a espera se arrasta (o "loop" de polling). */
const SLOW_MESSAGES = [
  "Calma que já vai… o servidor foi tomar um cafezinho ☕",
  "Ainda no forno — segura aí que sai quentinho 🔥",
  "Quase lá! Obrigado pela paciência 💚💛",
];

const SLOW_AFTER_MS = 6000;
const ROTATE_MS = 4000;

/**
 * Full-screen blurred backdrop: bandeira-diploma da marca + spinner + frase na espera.
 * O miolo é um componente próprio que MONTA quando show liga — slow/idx nascem
 * zerados a cada exibição, sem "reset" via setState síncrono em efeito.
 */
export function LoadingOverlay({ show, message }: LoadingOverlayProps) {
  if (!show) return null;
  return <LoadingVeil message={message} />;
}

function LoadingVeil({ message }: { message?: string }) {
  const [slow, setSlow] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!slow) return;
    const r = setInterval(() => setIdx((i) => (i + 1) % SLOW_MESSAGES.length), ROTATE_MS);
    return () => clearInterval(r);
  }, [slow]);

  return (
    <div
      aria-live="polite"
      aria-label={message ?? "Carregando"}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-brand-ink/45 backdrop-blur-md"
    >
      <div className="pointer-events-none w-44 sm:w-52">
        <DiplomaFlag />
      </div>

      <span className="size-12 animate-spin rounded-full border-4 border-white/40 border-t-brand-green" />

      {message ? (
        <p className="max-w-xs px-6 text-center text-base font-bold leading-relaxed text-white">
          {message}
        </p>
      ) : null}
      {slow ? (
        <p className="max-w-xs px-6 text-center text-sm font-semibold leading-relaxed text-white/90">
          {SLOW_MESSAGES[idx]}
        </p>
      ) : null}
    </div>
  );
}
