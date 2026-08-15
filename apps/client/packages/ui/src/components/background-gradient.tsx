import type { ReactNode } from "react";

import styles from "./background-gradient.module.css";

/**
 * Background Gradient (Aceternity) — caixa com borda de gradiente animada
 * girando ao redor, recolorida para a bandeira (verde/azul/dourado sobre base
 * escura). Duas camadas: `glow` (desfocada, o brilho) e a nítida (a borda);
 * o conteúdo fica por cima e precisa de fundo próprio para a borda aparecer.
 * Anima só background-position e respeita prefers-reduced-motion.
 *
 * `containerClassName`: dimensiona/posiciona a caixa de fora.
 * `className`: estiliza o miolo (dê um fundo + rounded para ver a borda).
 */
export function BackgroundGradient({
  children,
  className,
  containerClassName,
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <div className={`${styles.wrap}${containerClassName ? ` ${containerClassName}` : ""}`}>
      <div className={`${styles.layer} ${styles.glow}`} aria-hidden="true" />
      <div className={styles.layer} aria-hidden="true" />
      <div className={`${styles.content}${className ? ` ${className}` : ""}`}>{children}</div>
    </div>
  );
}
