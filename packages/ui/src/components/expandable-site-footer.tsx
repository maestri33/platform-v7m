"use client";

import { useState } from "react";
import { VersionBadge } from "./version-badge";

/**
 * Componente Separado: Rodapé Institucional Expansível / Menu Footer.
 * Design robusto e responsivo para telas estreitas (360px–430px):
 * - Barra de 1 linha compacta no rodapé.
 * - Ao tocar/clicar em qualquer lugar, expande com quebra fluida (flex-wrap) e alto contraste para visualização nítida.
 */
export function ExpandableSiteFooter() {
  const [isOpen, setIsOpen] = useState(false);
  const year = new Date().getFullYear();
  const sep = <span className="text-white/30 select-none">·</span>;

  return (
    <footer className="relative z-30 w-full bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl transition-all duration-300">
      {/* Faixa tricolor fina */}
      <div className="h-[2px] w-full bg-gradient-to-r from-brand-green via-brand-yellow to-brand-blue-bright" />

      {/* Barra de Toggle Compacta */}
      <div className="w-full px-4 py-2 box-border">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 text-[12px] font-medium text-slate-200 transition-colors hover:text-white"
          aria-expanded={isOpen}
          aria-label="Informações legais e institucionais"
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-extrabold text-white text-xs">
              Supletivo <span className="text-emerald-400">Brasil</span>
            </span>
            <span className="text-[11px] text-slate-400">© {year}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400 shrink-0">
            <span>{isOpen ? "Fechar" : "Menu Legal"}</span>
            <svg
              className={`size-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {/* Conteúdo Expansível com Alto Contraste e Quebra Fluida */}
        {isOpen && (
          <div className="mt-2.5 border-t border-slate-800 pt-2.5 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] leading-relaxed text-slate-300">
              <span className="font-semibold text-slate-100">CNPJ 48.811.016/0001-00</span>
              {sep}
              <a
                href="mailto:contato@supletivo.net.br"
                className="underline underline-offset-2 text-slate-200 hover:text-white"
              >
                contato@supletivo.net.br
              </a>
              {sep}
              <a
                href="https://supletivo.net.br/termos/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-400 underline-offset-2 hover:underline"
              >
                Termos
              </a>
              {sep}
              <a
                href="https://supletivo.net.br/privacidade/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-400 underline-offset-2 hover:underline"
              >
                Privacidade
              </a>
              {sep}
              <a
                href="https://maestri.group"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-300 hover:text-white"
              >
                Maestri Group
              </a>
            </div>

            <div className="mt-2.5 flex flex-col sm:flex-row items-center justify-center gap-2">
              <p className="text-center text-[10.5px] leading-snug text-slate-400 max-w-sm">
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
