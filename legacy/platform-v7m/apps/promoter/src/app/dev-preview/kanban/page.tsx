import type { Metadata } from "next";

import { KanbanBoardDemo } from "./KanbanBoardDemo";

// Preview isolado do Kanban Glass Columns. 404 em produção — não é rota
// de produto. Reaproveita o padrão do /dev-preview/ (mesma estética
// dark/aurora, mesmo header minimal).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kanban · Glass Columns",
  description: "Preview do componente Kanban — design A, glass columns.",
};

export default function KanbanPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    // Não polui o build de produção com rota de demo.
    return null;
  }

  return (
    <main
      id="main"
      className="min-h-[100dvh] bg-[var(--bg)]"
    >
      <PreviewHeader />
      <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8">
        <div className="space-y-1.5">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[var(--gold-soft)]">
            Dev preview · Kanban A
          </p>
          <h1 className="font-display text-[clamp(24px,5vw,34px)] font-extrabold tracking-[-0.01em] text-[var(--surface-text)]">
            Glass Columns
          </h1>
          <p className="text-[14px] text-[var(--surface-text-muted)]">
            Drag-and-drop agnóstico de domínio. Desktop: grid 3 colunas com
            blur. Mobile: snap horizontal com dots de paginação. Estado
            mantido em memória — a API de <code className="rounded bg-white/5 px-1 py-0.5 text-[12px]">onMove</code>{" "}
            é o ponto de integração com a store real.
          </p>
        </div>

        <KanbanBoardDemo />
      </div>
    </main>
  );
}

function PreviewHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--surface-border)] bg-[var(--surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="V7M" className="h-5 w-auto" />
          <span className="text-[var(--gold-ink)] font-display" aria-hidden="true">
            ·
          </span>
          <span className="font-display text-sm text-[var(--surface-text-muted)]">
            Dev preview · Kanban
          </span>
        </div>
        <a
          href="/dev-preview"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[var(--surface-text-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--surface-text)]"
        >
          ← Voltar ao showcase
        </a>
      </div>
    </header>
  );
}
