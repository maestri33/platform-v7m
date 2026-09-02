"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * Modal de erro do wizard de matrícula (decisão do Victor 2026-07-19: erro de
 * captura/validação aparece em MODAL, não inline — e ao fechar o componente
 * volta pronto pra nova tentativa). Esc e clique fora fecham; foco entra no
 * botão e o Tab não escapa (um botão só).
 */
export function StepErrorModal({
  title = "Ops, não deu certo",
  message,
  actionLabel = "Entendi",
  onClose,
}: {
  title?: string;
  message: string;
  actionLabel?: string;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    boxRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // um único botão focável: prende o Tab nele
      if (e.key === "Tab") {
        e.preventDefault();
        boxRef.current?.querySelector<HTMLElement>("button")?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-ink/50 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-6 text-center shadow-xl"
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-danger-bg text-brand-danger">
          <svg
            className="size-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M9.6 12.6l4.8 4.8M14.4 12.6l-4.8 4.8" />
          </svg>
        </span>
        <h3 className="text-lg font-extrabold text-brand-ink">{title}</h3>
        <p className="text-[15px] leading-relaxed text-brand-muted">{message}</p>
        <Button onClick={onClose}>{actionLabel}</Button>
      </div>
    </div>
  );
}
