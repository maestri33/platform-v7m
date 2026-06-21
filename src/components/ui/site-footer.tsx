import styles from "./site-footer.module.css";

/**
 * Rodapé institucional COMPACTO — o básico legal da empresa sem empurrar o
 * conteúdo pra fora da janela: marca + CNPJ/contato + uma linha legal
 * (MEC/LDB + LGPD) + links + copyright. Faixa tricolor no topo. Escuro/vidro,
 * assenta sobre o fundo aurora.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-brand-ink/40 backdrop-blur-xl">
      {/* faixa tricolor: verde / amarelo / azul */}
      <div className="h-[3px] w-full bg-gradient-to-r from-brand-green via-brand-yellow to-brand-blue-bright" />

      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-1.5 px-6 py-4 text-center">
        <div className="flex items-center gap-2">
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
          <span className="text-sm font-extrabold tracking-tight text-white">
            Supletivo <span className="text-brand-green-light">Brasil</span>
          </span>
        </div>

        <p className="text-[11px] leading-relaxed text-white/60">
          CNPJ 48.811.016/0001-00 ·{" "}
          <a
            href="mailto:contato@supletivo.net.br"
            className="underline underline-offset-2 transition hover:text-white"
          >
            contato@supletivo.net.br
          </a>
        </p>

        <p className="text-[11px] leading-relaxed text-white/45">
          Certificação por instituição credenciada ao MEC (Lei nº 9.394/96 — LDB). Dados tratados
          conforme a LGPD.
        </p>

        <nav className="flex flex-wrap items-center justify-center gap-x-4 text-[12px] font-bold text-white/80">
          <a
            href="https://supletivo.net.br/termos/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center transition hover:text-white"
          >
            Termos
          </a>
          <a
            href="https://supletivo.net.br/privacidade/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center transition hover:text-white"
          >
            Privacidade
          </a>
          <a
            href="https://v7m.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center transition hover:text-white"
          >
            V7M
          </a>
          <span className="text-white/40">© {year}</span>
        </nav>
      </div>
    </footer>
  );
}
