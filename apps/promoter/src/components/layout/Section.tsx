import type { ReactNode } from "react";

type SectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Seção vertical com ritmo `--space-section`. Fundo configurável via className. */
export function Section({ children, className = "", id }: SectionProps) {
  const cls = ["section-y", className].filter(Boolean).join(" ");
  return (
    <section id={id} className={cls}>
      {children}
    </section>
  );
}
