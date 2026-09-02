import styles from "./site-footer.module.css";
import { VersionBadge } from "./version-badge";
import { LiquidGlass } from "../primitives/liquid-glass";

/**
 * Rodapé institucional — informações na horizontal (fluem numa linha que quebra
 * com elegância), não empilhadas. Marca + CNPJ/contato + links + copyright, e
 * uma linha legal (MEC/LDB + LGPD) abaixo. Faixa tricolor no topo.
 * Renderizado com refração óptica LiquidGlass (100% Server Component).
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const sep = <span className="text-white/40 select-none">·</span>;
  return (
    // Compactação 2026-07-28: faixa 2px, py mínimo, tipografia 10px e
    // links sem alvo de 48px — o rodapé é institucional, não é caminho do funil.
    <LiquidGlass
      as="footer"
      cornerRadius={0}
      displacementScale={45}
      blurAmount={0.12}
      saturation={160}
      showBorders={false}
      showHoverEffect={false}
      className="relative border-t border-white/10 shadow-[var(--shadow-glass)] pb-[env(safe-area-inset-bottom)]"
    >
      {/* faixa tricolor: verde / amarelo / azul */}
      <div className="h-[2px] w-full bg-gradient-to-r from-brand-green via-brand-yellow to-brand-blue-bright" />

      <div className="mx-auto w-full max-w-3xl px-4 py-1.5">
        <nav
          aria-label="Links institucionais do rodapé"
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs leading-tight text-white/80"
        >
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
            Supletivo <span className="text-emerald-400">Brasil</span>
          </span>
          {sep}
          <span className="text-white font-medium">CNPJ 48.811.016/0001-00</span>
          {sep}
          <a
            href="mailto:contato@supletivo.net.br"
            className="text-white underline underline-offset-2 transition hover:text-emerald-400"
          >
            contato@supletivo.net.br
          </a>
          {sep}
          <a
            href="https://supletivo.net.br/termos/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-semibold text-emerald-400 underline underline-offset-2 transition hover:text-emerald-300"
          >
            Termos
          </a>
          {sep}
          <a
            href="https://supletivo.net.br/privacidade/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-semibold text-emerald-400 underline underline-offset-2 transition hover:text-emerald-300"
          >
            Privacidade
          </a>
          {sep}
          <a
            href="https://maestri.group"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-semibold text-white transition hover:text-emerald-400"
          >
            Maestri Group
          </a>
          {sep}
          <span className="text-white/60">© {year}</span>
        </nav>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <p className="text-center text-[11px] leading-snug text-white/70">
            Certificação por instituição credenciada ao MEC (Lei nº 9.394/96 — LDB). Dados tratados
            conforme a LGPD.
          </p>
          <VersionBadge />
        </div>
      </div>
    </LiquidGlass>
  );
}
