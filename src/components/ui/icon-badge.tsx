import type { ReactNode } from "react";

import styles from "./icon-badge.module.css";

/**
 * Selo de marca: quadrado com gradiente verde→azul, brilho que pulsa e leve
 * flutuação. Recebe um ícone (SVG) como filho. Usado no topo dos cards do funil
 * pra dar identidade e vida consistentes. Decorativo (aria-hidden).
 */
export function IconBadge({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={`mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue-bright text-white shadow-[0_10px_28px_rgba(0,156,59,0.4)] ${styles.badge}`}
    >
      {children}
    </div>
  );
}
