"use client";

import { useState } from "react";
import { VersionBadge } from "./version-badge";
import styles from "./site-footer.module.css";

/**
 * Rodapé Institucional Expansível / Sanfona (Glassmorphism Translúcido)
 * - Barra compacta translúcida com a bandeirinha brasileira no mastro animada.
 * - Ao tocar/clicar em "Menu Legal" ou na barra, abre a gaveta com animação suave revelando dados legais completos.
 * - Cores e contrastes utilizando tokens semânticos nativos do Design System.
 */
export function ExpandableSiteFooter() {
  const [isOpen, setIsOpen] = useState(false);
  const year = new Date().getFullYear();
  const sep = <span className="text-white/35 select-none">·</span>;

  return (
    <footer className="relative z-30 w-full border-t border-white/10 bg-brand-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl transition-all duration-300">
      {/* Faixa tricolor fina: verde / amarelo / azul */}
      <div className="h-[2px] w-full bg-gradient-to-r from-brand-green via-brand-yellow to-brand-blue-bright" />

      {/* Barra de Toggle Compacta */}
      <div className="w-full px-4 py-2 box-border">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 text-[12px] font-medium text-white/85 transition-colors hover:text-white focus:outline-none"
          aria-expanded={isOpen}
          aria-label="Informações legais e institucionais"
        >
          {/* Lado Esquerdo: Bandeirinha no mastro + Marca + Ano */}
          <div className="flex items-center gap-2 shrink-0">
            <svg className={styles.flag} viewBox="0 0 84 64" fill="none" aria-hidden="true">
              <rect x="4" y="2" width="4" height="60" rx="2" fill="#ffffff2b" />
              <circle cx="6" cy="3" r="3" fill="var(--color-brand-yellow)" />
              <g className={styles.cloth}>
                <rect x="8" y="6" width="62" height="40" rx="4" fill="var(--color-brand-green)" />
                <path d="M39 12l22 14-22 14-22-14z" fill="var(--color-brand-yellow)" />
                <circle cx="39" cy="26" r="8.5" fill="var(--color-brand-blue)" />
                <path
                  d="M35.5 26.2l2.8 2.8 5.2-5.6"
                  stroke="#fff"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
            <span className="font-extrabold text-white text-xs">
              Supletivo <span className="text-brand-green-light">Brasil</span>
            </span>
            <span className="text-[11px] text-white/60">© {year}</span>
          </div>

          {/* Lado Direito: Ação de Expandir / Fechar */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-green-light shrink-0">
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

        {/* Conteúdo Expansível / Gaveta Animada */}
        {isOpen && (
          <div className="mt-2.5 border-t border-white/10 pt-2.5 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] leading-relaxed text-white/80">
              <span className="font-semibold text-white">CNPJ 48.811.016/0001-00</span>
              {sep}
              <a
                href="mailto:contato@supletivo.net.br"
                className="underline underline-offset-2 text-white/90 hover:text-white transition-colors"
              >
                contato@supletivo.net.br
              </a>
              {sep}
              <a
                href="https://supletivo.net.br/termos/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-green-light underline-offset-2 hover:underline"
              >
                Termos
              </a>
              {sep}
              <a
                href="https://supletivo.net.br/privacidade/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-green-light underline-offset-2 hover:underline"
              >
                Privacidade
              </a>
              {sep}
              <a
                href="https://maestri.group"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white/80 hover:text-white transition-colors"
              >
                Maestri Group
              </a>
            </div>

            <div className="mt-2.5 flex flex-col sm:flex-row items-center justify-center gap-2">
              <p className="text-center text-[10.5px] leading-snug text-white/60 max-w-sm">
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
