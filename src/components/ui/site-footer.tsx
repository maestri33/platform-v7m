import styles from "./site-footer.module.css";

/**
 * Rodapé institucional do app — o básico da empresa em toda página: marca +
 * bandeirinha tremulando, CNPJ/contato, aviso MEC/LDB + LGPD, links legais e
 * copyright. Faixa tricolor no topo (assinatura da bandeira). Escuro, de vidro,
 * para assentar sobre o fundo aurora. Portado do Footer.astro da landing.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-12 bg-brand-ink/40 backdrop-blur-xl">
      {/* faixa tricolor: verde / amarelo / azul */}
      <div className="h-[3px] w-full bg-gradient-to-r from-brand-green via-brand-yellow to-brand-blue-bright" />

      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-6 py-8">
        <div className="flex items-center gap-3">
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
          <span className="text-base font-extrabold tracking-tight text-white">
            Supletivo <span className="text-brand-green-light">Brasil</span>
          </span>
        </div>

        <p className="text-[13px] font-semibold text-white/80">
          CNPJ 48.811.016/0001-00 ·{" "}
          <a
            href="mailto:contato@supletivo.net.br"
            className="underline underline-offset-2 transition hover:text-white"
          >
            contato@supletivo.net.br
          </a>
        </p>

        <p className="text-[12px] leading-relaxed text-white/55">
          O Supletivo Brasil fornece o material didático e a preparação para a EJA. A certificação é
          emitida por instituição parceira credenciada ao MEC, com validade em todo o território
          nacional, nos termos da Lei nº 9.394/96 (LDB).
        </p>
        <p className="text-[12px] leading-relaxed text-white/55">
          Seus dados são usados apenas para a sua matrícula e comunicação sobre o curso, conforme a
          LGPD (Lei nº 13.709/2018).
        </p>

        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-bold text-white/80">
          <a
            href="https://supletivo.net.br/termos/"
            target="_blank"
            rel="noopener noreferrer"
            className="py-1 transition hover:text-white"
          >
            Termos de Uso
          </a>
          <a
            href="https://supletivo.net.br/privacidade/"
            target="_blank"
            rel="noopener noreferrer"
            className="py-1 transition hover:text-white"
          >
            Privacidade
          </a>
          <a
            href="https://v7m.org"
            target="_blank"
            rel="noopener noreferrer"
            className="py-1 transition hover:text-white"
          >
            Sobre a V7M
          </a>
        </nav>

        <p className="text-[12px] text-white/45">
          © {year} Supletivo Brasil. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
