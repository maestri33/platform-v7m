"use client";

import { usePathname } from "next/navigation";

import { ExpandableSiteFooter } from "./expandable-site-footer";

/**
 * O rodapé institucional retrátil (ExpandableSiteFooter) permanece visível
 * em 1 linha compacta em todas as telas, expandindo com um toque para exibir
 * CNPJ, MEC, LGPD e informações institucionais.
 */
const HIDE_ON: string[] = [];

export function ConditionalFooter() {
  const pathname = usePathname();
  const hidden = HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;
  return <ExpandableSiteFooter />;
}
