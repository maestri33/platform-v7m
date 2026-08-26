import { PageShell } from "@/components/layout/page-shell";

export default function Loading() {
  return (
    <PageShell width="narrow">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-gold-light">
        V7M
      </p>
      <p className="flex items-center gap-2 text-[var(--surface-text-muted)]">
        <span className="spinner" aria-hidden />
        Carregando…
      </p>
    </PageShell>
  );
}
