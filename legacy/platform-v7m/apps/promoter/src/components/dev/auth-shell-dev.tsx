import type { ReactNode } from "react";

import {
  LEGAL_PRIVACY_URL,
  LEGAL_TERMS_URL,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/public-config";

/**
 * Variante do AuthShell pro dev-preview:
 * - Mesma navbar/footer + fundo animado (identidade visual mantida)
 * - `<main>` com `overflow-y: auto` e `align-items: flex-start` pra mostrar
 *   TODOS os 3 estágios do CheckFlow empilhados, sem cortar
 * - Sem `max-w-[26rem]` no content wrapper — vira `max-w-3xl` pra caber
 *   os 3 cards lado a lado em telas grandes
 *
 * Use SÓ em dev preview. Em prod, a auth continua com AuthShell normal
 * (1 stage por viewport).
 */
export function AuthShellDev({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Fundo animado (fixed, atrás de tudo) + grain reaproveitado */}
      <div className="auth-bg grain" aria-hidden />

      {/* Navbar (mesma do AuthShell) */}
      <header className="auth-bar top-0 h-[60px] pt-[env(safe-area-inset-top)]">
        <div className="flex h-[60px] items-center justify-between px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="V7M" className="h-[22px] w-auto" />
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center min-h-[44px] rounded-full border border-[rgb(var(--line-light-rgb)_/_0.14)] px-4 text-[13.5px] font-semibold text-[var(--muted-on-dark)] transition-colors hover:text-white hover:border-[rgb(var(--gold-rgb)_/_0.4)] hover:bg-[rgb(var(--gold-rgb)_/_0.06)]"
          >
            Ajuda
          </a>
        </div>
        <div className="gold-rule" />
      </header>

      {/* Conteúdo (entre as barras, scrollable, sem max-w restritivo) */}
      <main
        id="main"
        className="absolute inset-x-0 top-[60px] bottom-[72px] overflow-y-auto px-5 py-8"
      >
        <div className="mx-auto w-full max-w-5xl space-y-8">{children}</div>
      </main>

      {/* Footer (mesmo do AuthShell) */}
      <footer className="auth-bar bottom-0 h-[72px] pb-[env(safe-area-inset-bottom)]">
        <div className="gold-rule" />
        <div className="flex h-[72px] flex-col items-center justify-center gap-0.5 text-center">
          <p className="text-[12px] text-[rgb(var(--muted-on-dark-rgb)_/_0.8)]">
            <a href={LEGAL_TERMS_URL} className="hover:text-white transition-colors">Termos</a>
            {" · "}
            <a href={LEGAL_PRIVACY_URL} className="hover:text-white transition-colors">Privacidade</a>
            {" · "}
            <a href="https://v7m.org" className="hover:text-white transition-colors">V7M</a>
            {" · © 2026"}
          </p>
          <p className="text-[11px] text-[rgb(var(--muted-on-dark-rgb)_/_0.55)]">
            Dados tratados conforme a LGPD.
          </p>
        </div>
      </footer>
    </>
  );
}
