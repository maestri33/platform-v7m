import type { ReactNode } from "react";

import styles from "./background-gradient.module.css";

export type GradientTone = "default" | "danger" | "warning" | "success";

export interface BackgroundGradientProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  tone?: GradientTone;
  animate?: boolean;
}

const TONE_CLASSES: Record<GradientTone, string> = {
  default: styles.toneDefault,
  danger: styles.toneDanger,
  warning: styles.toneWarning,
  success: styles.toneSuccess,
};

/**
 * Background Gradient (Aceternity) com suporte a Tones de Status (V7M).
 * - default: Cores institucionais da bandeira V7M (verde, azul, amarelo).
 * - danger: Tons de vermelho/carmim (vazio, pendente de ação, rejeitado).
 * - warning: Tons de laranja/âmbar/dourado (enviado, em análise, processando).
 * - success: Tons de verde esmeralda/azul claro (aprovado, deferido MEC, ativo).
 *
 * Anima via GPU nativa (background-position) e respeita prefers-reduced-motion.
 */
export function BackgroundGradient({
  children,
  className,
  containerClassName,
  tone = "default",
  animate = true,
}: BackgroundGradientProps) {
  const toneClass = TONE_CLASSES[tone] ?? styles.toneDefault;
  const animClass = animate ? "" : ` ${styles.staticLayer}`;

  return (
    <div className={`${styles.wrap}${containerClassName ? ` ${containerClassName}` : ""}`}>
      <div className={`${styles.layer} ${toneClass} ${styles.glow}${animClass}`} aria-hidden="true" />
      <div className={`${styles.layer} ${toneClass}${animClass}`} aria-hidden="true" />
      <div className={`${styles.content}${className ? ` ${className}` : ""}`}>{children}</div>
    </div>
  );
}
