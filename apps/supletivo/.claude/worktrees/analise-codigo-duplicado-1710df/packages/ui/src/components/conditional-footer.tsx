"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "./site-footer";

/**
 * O rodapé institucional aparece nas páginas "vitrine" (home, login, planos…),
 * mas SOME no funil de matrícula — ali é uma tarefa focada (documento, selfie,
 * assinatura) e o rodapé de marca só rouba a altura da dobra no mobile.
 */
const HIDE_ON = ["/matricula"];

export function ConditionalFooter() {
  const pathname = usePathname();
  const hidden = HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;
  return <SiteFooter />;
}
