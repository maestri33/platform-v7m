"use client";

import { Button } from "./button";

export interface FooterButton {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

interface WizardFooterProps {
  buttons: FooterButton[];
}

/**
 * Rodapé fixo do wizard de matrícula — renderiza os botões de ação reportados
 * por cada step via `setFooter`. Só aparece quando há botões (evita faixa
 * branca vazia nas fases de carregamento inicial).
 */
export function WizardFooter({ buttons }: WizardFooterProps) {
  if (!buttons.length) return null;
  return (
    <div className="sticky bottom-0 z-20 shrink-0 border-t border-brand-border bg-white/80 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-md flex-wrap justify-center gap-3">
        {buttons.map((b, i) => (
          <Button
            key={i}
            variant={b.variant ?? "primary"}
            onClick={b.onClick}
            loading={b.loading}
            disabled={b.disabled}
          >
            {b.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
