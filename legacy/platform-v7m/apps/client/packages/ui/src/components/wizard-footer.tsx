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
 * Wizard footer — fixed, compact (≤ 64 px), one row with only primary + secondary
 * actions. Rendered inside the flex shell so it stays pinned below the scroll area.
 * Zero links / legal text — pure action buttons.
 */
export function WizardFooter({ buttons }: WizardFooterProps) {
  if (!buttons.length) return null;

  return (
    <footer className="z-30 shrink-0 border-t border-white/10 bg-brand-ink/35 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-md items-center justify-center gap-3 px-6 py-2">
        {buttons.map((b, i) => (
          <Button
            key={b.label}
            variant={b.variant ?? (i === 0 ? "primary" : "secondary")}
            loading={b.loading}
            disabled={b.disabled}
            onClick={b.onClick}
            className="flex-1 min-h-11 text-base"
          >
            {b.label}
          </Button>
        ))}
      </div>
    </footer>
  );
}
