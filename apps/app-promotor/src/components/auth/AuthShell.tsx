import type { ReactNode } from "react";

import {
  LEGAL_PRIVACY_URL,
  LEGAL_TERMS_URL,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/public-config";

// Casca da tela de entrada (handoff auth): fundo animado + navbar (logo + Ajuda)
// + footer (legal + LGPD), ambas com a linha-gradiente dourada. Só a auth usa.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Fundo animado (fixed, atrás de tudo) + grain reaproveitado */}
      <div className="auth-bg grain" aria-hidden />

      {/* Navbar */}
      <header className="auth-bar top-0 h-[60px] pt-[env(safe-area-inset-top)]">
        <div className="flex h-[60px] items-center justify-between px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="V7M" className="h-[22px] w-auto" />
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 min-h-[44px] rounded-full border-[1.5px] border-[rgb(231_228_221/0.22)] px-4 text-[13.5px] font-semibold text-[#d4d4d8] transition-colors hover:text-white hover:border-[rgb(217_177_90/0.4)] hover:bg-[rgb(217_177_90/0.06)]"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            Ajuda
          </a>
        </div>
        <div className="gold-rule" />
      </header>

      {/* Conteúdo (entre as barras, centralizado) */}
      <main
        id="main"
        className="fixed inset-x-0 top-[60px] bottom-[72px] overflow-hidden flex items-center justify-center px-5"
      >
        <div className="w-full max-w-[26rem]">{children}</div>
      </main>

      {/* Footer */}
      <footer className="auth-bar bottom-0 h-[72px] pb-[env(safe-area-inset-bottom)]">
        <div className="gold-rule" />
        <div className="flex h-[72px] flex-col items-center justify-center gap-0.5 text-center">
          <p className="text-[12px] text-[rgb(180_180_187/0.8)]">
            <a href={LEGAL_TERMS_URL} className="hover:text-white transition-colors">Termos</a>
            {" · "}
            <a href={LEGAL_PRIVACY_URL} className="hover:text-white transition-colors">Privacidade</a>
            {" · "}
            <a href="https://v7m.org" className="hover:text-white transition-colors">V7M</a>
            {" · © 2026"}
          </p>
          <p className="text-[11px] text-[rgb(180_180_187/0.55)]">
            Dados tratados conforme a LGPD.
          </p>
        </div>
      </footer>
    </>
  );
}

/** Overlay de loading global (transição pro painel após o login). */
export function AuthOverlay() {
  return (
    <div className="auth-overlay" role="status" aria-label="Entrando…">
      <div className="auth-ring" aria-hidden />
    </div>
  );
}
