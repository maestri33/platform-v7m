import styles from "./site-footer.module.css";

/**
 * Rodapé institucional — informações na horizontal (fluem numa linha que quebra
 * com elegância), não empilhadas. Marca + CNPJ/contato + links + copyright, e
 * uma linha legal (MEC/LDB + LGPD) abaixo. Faixa tricolor no topo.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const sep = <span className="text-white/25">·</span>;
  return (
    // Compactação 2026-07-28 (pedido: conteúdo intacto, altura mínima — a tela do
    // funil precisa caber sem scroll): faixa 2px, py mínimo, tipografia 10px e
    // links sem alvo de 48px — o rodapé é institucional, não é caminho do funil.
    <footer className="relative bg-brand-ink/40 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      {/* faixa tricolor: verde / amarelo / azul */}
      <div className="h-[2px] w-full bg-gradient-to-r from-brand-green via-brand-yellow to-brand-blue-bright" />

      <div className="mx-auto w-full max-w-3xl px-4 py-1">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0 text-[10px] leading-tight text-white/65">
          <span className="flex items-center gap-1 font-extrabold text-white">
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
            Supletivo <span className="text-brand-green-light">Brasil</span>
          </span>
          {sep}
          <span>CNPJ 48.811.016/0001-00</span>
          {sep}
          <a
            href="mailto:contato@supletivo.net.br"
            className="underline underline-offset-2 transition hover:text-white"
          >
            contato@supletivo.net.br
          </a>
          {sep}
          <a
            href="https://supletivo.net.br/termos/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-semibold transition hover:text-white"
          >
            Termos
          </a>
          <a
            href="https://supletivo.net.br/privacidade/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-semibold transition hover:text-white"
          >
            Privacidade
          </a>
          <a
            href="https://v7m.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-semibold transition hover:text-white"
          >
            V7M
          </a>
          {sep}
          <span className="text-white/45">© {year}</span>
        </div>

        <p className="mt-0 text-center text-[9px] leading-snug text-white/40">
          Certificação por instituição credenciada ao MEC (Lei nº 9.394/96 — LDB). Dados tratados
          conforme a LGPD.
        </p>
      </div>
    </footer>
  );
}
