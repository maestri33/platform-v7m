"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "./site-footer";

/**
 * Rodapé institucional canônico — presente em todas as telas com elegância,
 * sem menus retráteis ou botões redundantes.
 */
const HIDE_ON: string[] = [];

export function ConditionalFooter() {
  const pathname = usePathname();
  const hidden = HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;
  return <SiteFooter />;
}
