import type { ReactNode } from "react";

import styles from "./app-nav.module.css";
import { BrandMarks, BrandRule } from "./brand-accents";

export interface AppNavProps {
  /** Nome da aplicação/marca a ser exibido no header (padrão: "Supletivo", com destaque) */
  appName?: string;
  /** Cor de destaque ou customizada para o branding se aplicável */
  brandColor?: string;
  /** Conteúdo ou elementos à direita da barra (ex.: status do token, doc links, whoami) */
  rightSlot?: ReactNode;
  /** Classes adicionais para o elemento <header> */
  className?: string;
}

/**
 * Shell canônico de navegação superior (NavBar) compartilhado no Design System @v7m/ui.
 * Totalmente agnóstico de lógica de negócio e hooks de sessão do app consumidor.
 *
 * Assinatura de marca: `BrandRule` na borda de baixo — o mesmo risco verde →
 * azul que o `SiteFooter` carrega na borda de cima — mais `BrandMarks` (verde /
 * amarelo / azul / branco) antes do nome. Ambos são decorativos e posicionados
 * sem custo de altura.
 */
export function AppNav({
  appName = "Supletivo",
  brandColor,
  rightSlot,
  className = "",
}: AppNavProps) {
  return (
    <header
      className={`sticky top-0 z-30 flex justify-center border-b border-white/10 bg-brand-ink/35 pt-[env(safe-area-inset-top)] backdrop-blur-xl ${styles.header} ${className}`}
    >
      {/* assinatura de marca: risco verde → azul (idêntico ao rodapé) */}
      <BrandRule placement="bottom" />

      <div className={`flex w-full max-w-lg items-center gap-3 px-6 py-3 ${styles.bar}`}>
        <BrandMarks className={styles.marks} animated />
        <span className="text-sm font-extrabold tracking-tight text-white">
          {appName === "Supletivo" ? (
            <>
              Supletivo{" "}
              <span
                className={brandColor ? undefined : "text-brand-green-light"}
                style={brandColor ? { color: brandColor } : { color: "var(--brand-accent-green)" }}
              >
                Brasil
              </span>
            </>
          ) : (
            appName
          )}
        </span>
        {rightSlot ? <div className="ml-auto flex items-center gap-2">{rightSlot}</div> : null}
      </div>
    </header>
  );
}
