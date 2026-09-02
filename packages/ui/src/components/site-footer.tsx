import styles from "./site-footer.module.css";
import { VersionBadge } from "./version-badge";

/**
 * Rodapé institucional translúcido (Glassmorphism) fiel ao design original:
 * - Faixa tricolor sutil no topo
 * - Bandeirinha brasileira no mastro animada + Marca + CNPJ
 * - Links diretos (contato, Termos, Privacidade, Maestri Group, copyright)
 * - Texto legal do MEC/LDB e LGPD
 * - VersionBadge integrado
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const sep = <span className="text-white/30 select-none">·</span>;

  return (
    <footer className="relative w-full border-t border-white/10 bg-brand-ink/40 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-xl transition-all">
      {/* Faixa tricolor sutil: verde / amarelo / azul */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-brand-green/70 via-brand-yellow/70 to-brand-blue-bright/70" />

      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-1 px-4 text-center">
        {/* Linha 1: Bandeira + Marca + CNPJ */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] leading-tight text-white/80">
          <span className="flex items-center gap-1.5 font-extrabold text-white">
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
          <span className="font-semibold text-white/90">CNPJ 48.811.016/0001-00</span>
        </div>

        {/* Linha 2: Contato + Termos + Privacidade + Grupo + Ano */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] leading-tight text-white/70">
          <a
            href="mailto:contato@supletivo.net.br"
            className="underline underline-offset-2 text-white/85 hover:text-white transition-colors"
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
          {sep}
          <span className="text-white/50">© {year}</span>
        </div>

        {/* Linha 3: Texto Legal MEC / LGPD */}
        <p className="mt-0.5 text-[10px] leading-snug text-white/50 max-w-sm">
          Certificação por instituição credenciada ao MEC (Lei nº 9.394/96 – LDB). Dados tratados conforme a LGPD.
        </p>

        {/* Linha 4: Version Badge */}
        <div className="mt-0.5">
          <VersionBadge />
        </div>
      </div>
    </footer>
  );
}
