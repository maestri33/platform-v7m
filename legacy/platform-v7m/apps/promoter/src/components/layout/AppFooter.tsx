import { Container } from "@/components/layout/Container";
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from "@/lib/public-config";

/**
 * Rodapé discreto do frame do app (mesma assinatura da Auth: linha-gradiente
 * dourada + créditos institucionais + LGPD). Só entra quando NÃO há bottom-nav
 * de promotor — senão comeria a área de conteúdo e colidiria com a nav.
 */
export function AppFooter() {
  return (
    <footer className="shrink-0 bg-[var(--bg)]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="gold-rule" />
      <Container className="py-3 flex flex-col items-center gap-0.5 text-center">
        <p className="text-[12px] text-[var(--surface-text-muted)]">
          <a href={LEGAL_TERMS_URL} className="hover:text-[var(--surface-text)] transition-colors">Termos</a>
          {" · "}
          <a href={LEGAL_PRIVACY_URL} className="hover:text-[var(--surface-text)] transition-colors">Privacidade</a>
          {" · "}
          <a href="https://v7m.org" className="hover:text-[var(--surface-text)] transition-colors">V7M</a>
          {" · © 2026"}
        </p>
        <p className="text-[11px] text-[var(--surface-text-muted)] opacity-70">
          Dados tratados conforme a LGPD.
        </p>
      </Container>
    </footer>
  );
}
