import styles from "./brand-accents.module.css";

/**
 * Assinatura visual de marca do ecossistema V7M / Supletivo Brasil.
 *
 * Três peças, todas puramente decorativas (`aria-hidden`) e alimentadas
 * exclusivamente pelos tokens de `tokens/colors.css`:
 *
 * - `BrandRule`  — o "risco" de acento: gradiente verde → azul, 2px,
 *   aplicado IDÊNTICO na borda de baixo do navbar e na borda de cima do
 *   footer. Posicionado em absolute: não acrescenta altura nenhuma.
 * - `BrandMarks` — quatro marcas mínimas (verde / amarelo / azul / branco).
 * - `BrandAccentField` — dois blobs desfocados (verde à esquerda, azul à
 *   direita) atrás do conteúdo do footer. Também sem custo de layout.
 */

export interface BrandRuleProps {
  /** `top` no footer, `bottom` no navbar. */
  placement?: "top" | "bottom";
  className?: string;
}

export function BrandRule({ placement = "top", className = "" }: BrandRuleProps) {
  const place = placement === "bottom" ? styles.ruleBottom : styles.ruleTop;
  return <div aria-hidden="true" className={`${styles.rule} ${place} ${className}`} />;
}

export interface BrandMarksProps {
  /** Respiração lenta de opacidade (silenciada por prefers-reduced-motion). */
  animated?: boolean;
  className?: string;
}

export function BrandMarks({ animated = false, className = "" }: BrandMarksProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="presentation"
      viewBox="0 0 31 10"
      fill="none"
      className={`${styles.marks} ${animated ? styles.marksPulse : ""} ${className}`}
    >
      {/* verde — losango */}
      <path d="M4 2.1 6.2 5 4 7.9 1.8 5Z" fill="var(--brand-accent-green)" />
      {/* amarelo — ponto */}
      <circle cx="11.6" cy="5" r="1.9" fill="var(--brand-accent-yellow)" />
      {/* azul — risco vertical */}
      <rect
        x="17.3"
        y="1.3"
        width="1.9"
        height="7.4"
        rx="0.95"
        fill="var(--brand-accent-blue)"
      />
      {/* branco — cruz fina */}
      <path
        d="M26 1.5v7M22.5 5h7"
        stroke="var(--brand-accent-white)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandAccentField({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`${styles.field} ${className}`}>
      <svg
        aria-hidden="true"
        focusable="false"
        role="presentation"
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        fill="none"
        className={styles.fieldSvg}
      >
        <ellipse cx="52" cy="18" rx="104" ry="40" fill="var(--brand-accent-green)" />
        <ellipse cx="348" cy="86" rx="112" ry="42" fill="var(--brand-accent-blue)" />
        <ellipse cx="212" cy="8" rx="46" ry="18" fill="var(--brand-accent-yellow)" />
      </svg>
    </div>
  );
}
