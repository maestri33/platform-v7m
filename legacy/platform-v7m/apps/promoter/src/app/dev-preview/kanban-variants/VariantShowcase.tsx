"use client";

import { useState } from "react";

import {
  KanbanAttentionBoard,
  KanbanSectionedBoard,
  KanbanWithAvatarsBoard,
  KanbanCompactMobileBoard,
} from "@/components/kanban";
import {
  ATTENTION_ITEMS,
  COLUMNS,
  COMPACT_ITEMS,
  SECTIONED_ITEMS,
  WITH_AVATARS_ITEMS,
} from "./data";

type VariantId = "attention" | "avatars" | "sectioned" | "compact";

const VARIANTS: { id: VariantId; title: string; subtitle: string; when: string }[] = [
  {
    id: "attention",
    title: "Attention",
    subtitle: "Card com borda + glow vermelho e label 'ATENÇÃO' quando o item tem state=attention.",
    when: "Urgências, deadlines estourados, blockers — qualquer card que precisa de olhar imediato.",
  },
  {
    id: "avatars",
    title: "With Avatars",
    subtitle: "Card com avatar (foto ou iniciais) do assignee + stack quando há múltiplos.",
    when: "Trabalho em equipe, design review, tarefas com responsável claro.",
  },
  {
    id: "sectioned",
    title: "Sectioned",
    subtitle: "Cada coluna tem seu accent (gold/info/ok/danger) e os cards ganham faixa lateral 3px.",
    when: "Quando as colunas representam status muito distintos e a região visual importa.",
  },
  {
    id: "compact",
    title: "Compact Mobile",
    subtitle: "Em ≤ md: strip horizontal (avatar + título + chevron). Click expande com motion.",
    when: "Notificações, inbox, listas densas em mobile — toque rápido sem perder info.",
  },
];

export function VariantShowcase() {
  const [active, setActive] = useState<VariantId>("attention");
  return (
    <main
      id="main"
      className="min-h-[100dvh] bg-[var(--bg)]"
    >
      <header className="sticky top-0 z-30 border-b border-[var(--surface-border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="V7M" className="h-5 w-auto" />
            <span className="text-[var(--gold-ink)] font-display" aria-hidden="true">·</span>
            <span className="font-display text-sm text-[var(--surface-text-muted)]">
              Dev preview · Kanban Variantes
            </span>
          </div>
          <a
            href="/dev-preview/kanban"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[var(--surface-text-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--surface-text)]"
          >
            ← Kanban base
          </a>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8">
        <div className="space-y-1.5">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[var(--gold-soft)]">
            Dev preview · Kanban Variantes
          </p>
          <h1 className="font-display text-[clamp(24px,5vw,34px)] font-extrabold tracking-[-0.01em] text-[var(--surface-text)]">
            Quatro boards, prontos pra usar
          </h1>
          <p className="text-[14px] text-[var(--surface-text-muted)]">
            Cada variante é um componente drop-in: copia o arquivo
            <code className="rounded bg-white/5 px-1.5 py-0.5 text-[12px] mx-1">
              src/components/kanban/variants/&lt;Nome&gt;.tsx
            </code>
            pra outro projeto e ele já funciona com a base
            <code className="rounded bg-white/5 px-1.5 py-0.5 text-[12px] mx-1">
              KanbanBoard
            </code>.
          </p>
        </div>

        <nav
          aria-label="Variantes"
          className="flex flex-wrap items-center gap-2"
        >
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(v.id)}
              aria-current={active === v.id ? "true" : undefined}
              className={[
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                active === v.id
                  ? "border-[var(--gold)] bg-[var(--gold-grad)] text-[var(--black)]"
                  : "border-white/10 bg-white/5 text-[var(--surface-text-muted)] hover:border-[var(--gold)] hover:text-[var(--surface-text)]",
              ].join(" ")}
            >
              {v.title}
            </button>
          ))}
        </nav>

        {VARIANTS.filter((v) => v.id === active).map((v) => (
          <section key={v.id} className="space-y-3">
            <header className="space-y-1">
              <h2 className="font-display text-[20px] font-extrabold tracking-[-0.01em] text-[var(--surface-text)]">
                {v.title}
              </h2>
              <p className="text-[13px] text-[var(--surface-text-muted)]">
                {v.subtitle}
              </p>
              <p className="text-[12px] text-[var(--muted-on-dark)]">
                <strong>Quando usar:</strong> {v.when}
              </p>
            </header>
            <div className="space-y-4">
              {renderVariant(v.id)}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function renderVariant(id: VariantId) {
  switch (id) {
    case "attention":
      return <KanbanAttentionBoard items={ATTENTION_ITEMS} columns={COLUMNS} />;
    case "avatars":
      return (
        <KanbanWithAvatarsBoard items={WITH_AVATARS_ITEMS} columns={COLUMNS} />
      );
    case "sectioned":
      return (
        <KanbanSectionedBoard
          items={SECTIONED_ITEMS}
          columns={COLUMNS.map((c) => ({ ...c, accent: c.accent ?? "muted" }))}
        />
      );
    case "compact":
      return <KanbanCompactMobileBoard items={COMPACT_ITEMS} columns={COLUMNS} />;
  }
}
