import styles from "./site-footer.module.css";
import { BrandAccentField, BrandMarks, BrandRule } from "./brand-accents";
import { VersionBadge } from "./version-badge";
import { LiquidGlass } from "../primitives/liquid-glass";

/**
 * Rodapé institucional — informações na horizontal (fluem numa linha que quebra
 * com elegância), não empilhadas. Marca + CNPJ/contato + links + copyright, e
 * uma linha legal (MEC/LDB + LGPD) abaixo, com a versão na mesma faixa.
 * Renderizado com refração óptica LiquidGlass (100% Server Component).
 *
 * Assinatura de marca: `BrandRule` no topo — o mesmo risco verde → azul que o
 * navbar carrega na borda de baixo — mais acentos SVG discretos
 * (`BrandAccentField` atrás do conteúdo, `BrandMarks` no fim da linha
 * institucional).
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  // `/40` compositava em ~#71797f sobre o vidro do rodapé = 3,7:1 (reprova AA).
  // `/60` é a MESMA opacidade que o "© {ano}" desta faixa já usa: 6,7:1 medido.
  const sep = <span className="text-white/60 select-none">·</span>;
  return (
    // Compactação 2026-09-02: métrica migrada pro CSS Module (o Tailwind do app
    // não varre este pacote, então `h-[2px]`/`text-[10.5px]` sumiam em runtime
    // e o rodapé inflava). O rodapé é institucional, não é caminho do funil.
    <LiquidGlass
      as="footer"
      cornerRadius={0}
      displacementScale={45}
      blurAmount={0.12}
      saturation={160}
      showBorders={false}
      showHoverEffect={false}
      className={`relative border-t border-white/10 shadow-[var(--shadow-glass)] pb-[env(safe-area-inset-bottom)] ${styles.footer}`}
    >
      {/* acentos decorativos: blobs verde/azul/amarelo desfocados, sem custo de layout */}
      <BrandAccentField />
      {/* assinatura de marca: risco verde → azul (idêntico ao navbar) */}
      <BrandRule placement="top" />

      <div className={`mx-auto w-full max-w-3xl ${styles.shell}`}>
        <nav
          aria-label="Links institucionais do rodapé"
          className={`flex flex-wrap items-center justify-center leading-tight text-white/80 ${styles.nav}`}
        >
          <span className="flex items-center gap-1 font-extrabold text-white">
            <svg className={styles.flag} viewBox="0 0 84 64" fill="none" aria-hidden="true">
              <rect
                x="4"
                y="2"
                width="4"
                height="60"
                rx="2"
                fill="var(--brand-accent-white)"
                fillOpacity="0.17"
              />
              <circle cx="6" cy="3" r="3" fill="var(--color-brand-yellow, var(--color-yellow))" />
              <g className={styles.cloth}>
                <rect
                  x="8"
                  y="6"
                  width="62"
                  height="40"
                  rx="4"
                  fill="var(--color-brand-green, var(--color-green))"
                />
                <path
                  d="M39 12l22 14-22 14-22-14z"
                  fill="var(--color-brand-yellow, var(--color-yellow))"
                />
                <circle
                  cx="39"
                  cy="26"
                  r="8.5"
                  fill="var(--color-brand-blue, var(--color-blue))"
                />
                <path
                  d="M35.5 26.2l2.8 2.8 5.2-5.6"
                  stroke="var(--brand-accent-white)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
            Supletivo <span className={`text-emerald-400 ${styles.accentText}`}>Brasil</span>
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
            className={`inline-flex items-center font-semibold text-emerald-400 underline underline-offset-2 transition hover:text-emerald-300 ${styles.accentLink}`}
          >
            Termos
          </a>
          {sep}
          <a
            href="https://supletivo.net.br/privacidade/"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center font-semibold text-emerald-400 underline underline-offset-2 transition hover:text-emerald-300 ${styles.accentLink}`}
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
          <BrandMarks className={styles.navMarks} animated />
        </nav>

        <div className={styles.legalRow}>
          <p className={`text-center text-white/70 ${styles.legal}`}>
            Certificação por instituição credenciada ao MEC (Lei nº 9.394/96 — LDB). Dados tratados
            conforme a LGPD.
          </p>
          <VersionBadge className={styles.badge} />
        </div>
      </div>
    </LiquidGlass>
  );
}
