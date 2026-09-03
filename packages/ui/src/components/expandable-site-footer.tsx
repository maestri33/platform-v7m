"use client";

import { useState } from "react";
import { BrandMarks, BrandRule } from "./brand-accents";
import { VersionBadge } from "./version-badge";

/**
 * Rodapé Institucional Expansível Canônico (Sanfona Elegante)
 * - Barra compacta inicial: "Supletivo Brasil © 2026" à esquerda e "MENU LEGAL ∨" à direita.
 * - Ao clicar/tocar, expande suavemente exibindo os dados legais completos (CNPJ, e-mail, termos, privacidade, MEC/LDB e versão).
 * - Alta legibilidade e contraste compatível com WCAG.
 * - Carrega a mesma assinatura de marca do `SiteFooter` e do `AppNav`: o risco
 *   verde → azul na borda de cima e as marcas SVG verde/amarelo/azul/branco.
 *
 * Nota: as utilitárias de valor arbitrário deste arquivo (`text-[13px]`,
 * `text-[11px]`, `text-[10.5px]`, `pb-[env(safe-area-inset-bottom)]`) só chegam no browser depois
 * que o app consumidor apontar um `@source` do Tailwind pra `packages/ui`.
 * Este componente hoje não é montado por nenhum app.
 */
export function ExpandableSiteFooter() {
  const [isOpen, setIsOpen] = useState(false);
  const year = new Date().getFullYear();
  // `/40` compositava em ~#71797f sobre o vidro do rodapé = 3,7:1 (reprova AA).
  // `/60` é a MESMA opacidade que o "© {ano}" desta faixa já usa: 6,7:1 medido.
  const sep = <span className="text-white/60 select-none">·</span>;

  return (
    <footer className="relative z-30 w-full overflow-hidden border-t border-white/10 bg-brand-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl transition-all duration-300">
      {/* assinatura de marca: risco verde → azul (idêntico ao navbar e ao SiteFooter) */}
      <BrandRule placement="top" />

      {/* Barra Compacta de Navegação / Toggle */}
      <div className="relative w-full px-4 py-2 box-border">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 text-xs transition-opacity hover:opacity-90 focus:outline-none"
          aria-expanded={isOpen}
          aria-label="Informações legais e institucionais"
        >
          {/* Lado Esquerdo: Marca e Ano */}
          <div className="flex items-center gap-1.5 shrink-0 text-left">
            <BrandMarks animated />
            <span className="font-bold text-white text-[13px] tracking-tight">
              Supletivo <span className="text-emerald-400">Brasil</span>
            </span>
            <span className="text-[11px] text-white/50 font-normal">© {year}</span>
          </div>

          {/* Lado Direito: MENU LEGAL ∨ */}
          <div className="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-white/70 hover:text-white uppercase shrink-0 transition-colors">
            <span>{isOpen ? "FECHAR" : "MENU LEGAL"}</span>
            <svg
              className={`size-3.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-emerald-400" : "text-white/70"}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {/* Gaveta de Informações Legais Expandida */}
        {isOpen && (
          <div className="mt-3 border-t border-white/10 pt-3 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] leading-relaxed text-white">
              <span className="font-semibold text-white">CNPJ 48.811.016/0001-00</span>
              {sep}
              <a
                href="mailto:contato@supletivo.net.br"
                className="text-white underline underline-offset-2 hover:text-emerald-400 transition-colors"
              >
                contato@supletivo.net.br
              </a>
              {sep}
              <a
                href="https://supletivo.net.br/termos/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300 transition-colors"
              >
                Termos
              </a>
              {sep}
              <a
                href="https://supletivo.net.br/privacidade/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300 transition-colors"
              >
                Privacidade
              </a>
              {sep}
              <a
                href="https://maestri.group"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white hover:text-emerald-400 transition-colors"
              >
                Maestri Group
              </a>
            </div>

            <div className="mt-2.5 flex flex-col sm:flex-row items-center justify-center gap-2">
              <p className="text-center text-[10.5px] leading-snug text-white/70 max-w-sm">
                Certificação por instituição credenciada ao MEC (Lei nº 9.394/96 — LDB). Dados tratados conforme a LGPD.
              </p>
              <div className="shrink-0">
                <VersionBadge />
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
