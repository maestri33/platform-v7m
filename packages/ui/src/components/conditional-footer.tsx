"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "./site-footer";

/**
 * Rodapé institucional canônico — elegante, com a bandeirinha brasileira
 * tremulando no mastro, faixa tricolor e informações legais em linha horizontal.
 */
const HIDE_ON: string[] = [];

export function ConditionalFooter() {
  const pathname = usePathname();
  const hidden = HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;
  return <SiteFooter />;
}
