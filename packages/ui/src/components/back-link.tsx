import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "onDark" | "onLight";

interface BackLinkProps {
  /** Destino. Omita para renderizar um <span> inerte (telas de preview dev). */
  href?: string;
  /** Texto após a seta (ex.: "Voltar", "Painel"). */
  children: ReactNode;
  /** "onDark" = texto branco (telas de fundo escuro), "onLight" = azul (cards claros). */
  tone?: Tone;
  className?: string;
}

const TONE: Record<Tone, string> = {
  onDark: "text-white/95 hover:text-white",
  onLight: "text-brand-blue hover:text-brand-blue-bright",
};

/**
 * "← Voltar / Painel" — o link de retorno repetido no topo de quase toda tela do
 * funil. Centralizado num só primitivo: a seta, o tom (claro/escuro) e o alvo de
 * toque ≥44px (min-h-11) vivem aqui. Sem `href`, vira um <span> (as telas de
 * preview dev mostram a seta sem navegar).
 */
export function BackLink({ href, children, tone = "onDark", className = "" }: BackLinkProps) {
  const classes = `group inline-flex min-h-11 items-center self-start text-sm font-bold transition-all hover:opacity-100 ${TONE[tone]} ${className}`;
  const content = (
    <>
      <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
      <span className="ml-1.5">{children}</span>
    </>
  );
  if (!href) return <span className={classes}>{content}</span>;
  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
