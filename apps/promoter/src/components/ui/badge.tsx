import type { ReactNode } from "react";

type Tone = "ok" | "danger" | "warn" | "muted" | "gold";

/** Pílula de status (substitui spans inline com cores cruas green-700/red-700). */
export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
