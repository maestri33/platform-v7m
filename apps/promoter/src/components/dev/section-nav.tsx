"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { SECTIONS } from "./sections";

// re-export pra consumers existentes (DevThemeControl, etc.)
export { SECTIONS };

/**
 * Strip horizontal de botões no topo do showcase. Cliente: muda a URL e a
 * server page re-renderiza o showcase. Scroll preserva entre seções.
 */
export function SectionNav({ current, role }: { current: string; role: string }) {
  const router = useRouter();
  const go = useCallback(
    (id: string) => {
      const params = new URLSearchParams();
      params.set("section", id);
      params.set("role", role);
      router.push(`/dev-preview?${params.toString()}`);
    },
    [router, role],
  );

  return (
    <nav
      aria-label="Seções do dev preview"
      className="-mx-[var(--gutter)] mb-4 flex gap-2 overflow-x-auto px-[var(--gutter)] pb-2"
      style={{ scrollbarWidth: "thin" }}
    >
      {SECTIONS.map((s) => {
        const active = s.id === current;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            title={s.hint}
            aria-current={active ? "page" : undefined}
            className={
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors " +
              (active
                ? "border-brand-gold bg-[var(--gold-grad)] text-[var(--black)]"
                : "border-[var(--surface-border)] bg-[var(--surface)] text-[var(--surface-text-muted)] hover:border-brand-gold hover:text-[var(--surface-text)]")
            }
          >
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
