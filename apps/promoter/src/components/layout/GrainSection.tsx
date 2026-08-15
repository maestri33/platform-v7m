import type { ReactNode } from "react";

type GrainSectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Section com grain sutil — uso em superfícies escuras (atmosfera anti-flat). */
export function GrainSection({ children, className = "", id }: GrainSectionProps) {
  const cls = ["section-y", "grain", className].filter(Boolean).join(" ");
  return (
    <section id={id} className={cls}>
      {children}
    </section>
  );
}
