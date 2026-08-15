"use client";

import { Calendar, User } from "lucide-react";

import { KanbanBoard } from "../KanbanBoard";
import type { KanbanColumnDef, KanbanItem } from "../types";
import {
  ACCENT_TOKENS,
  type KanbanCardState,
  type KanbanSectionAccent,
} from "./types";

/**
 * Board "sectioned": cada coluna tem seu próprio accent (definido em
 * `column.accent`), e os cards da coluna ganham:
 *   - uma faixa lateral de 3px na cor do accent
 *   - header da coluna com pill nessa cor
 *
 * Útil quando as colunas representam status muito distintos (urgente,
 * em revisão, concluído) e o usuário precisa identificar visualmente
 * cada região sem ler o título.
 */
export type SectionedItem = KanbanItem & {
  title: string;
  assignee: string;
  due: string;
  state?: KanbanCardState;
};

type SectionedColumn = KanbanColumnDef & {
  accent: KanbanSectionAccent;
};

export function KanbanSectionedBoard({
  items,
  columns,
  onMove,
}: {
  items: SectionedItem[];
  columns: SectionedColumn[];
  onMove?: (id: string, from: string, to: string) => void;
}) {
  return (
    <KanbanBoard<SectionedItem>
      columns={columns}
      items={items}
      onMove={onMove}
      // Indica ao base qual accent usar (pelo columnId resolvido no
      // wrapper). Como o KanbanBoard só passa `renderCard` com o item
      // (não a coluna), embutimos o accent via metadata de borda: cada
      // card tem `left-stripe` colorido pelo accent da sua coluna.
      renderCard={(item) => <SectionedCard item={item} columns={columns} />}
    />
  );
}

function SectionedCard({
  item,
  columns,
}: {
  item: SectionedItem;
  columns: SectionedColumn[];
}) {
  const column = columns.find((c) => c.id === item.columnId);
  const accent = column?.accent ?? "muted";
  const token = ACCENT_TOKENS[accent];
  const isAttention = item.state === "attention";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-roledescription="kanban card"
      className={[
        "group block select-none",
        "rounded-[var(--radius-sm)]",
        "border border-white/8",
        "bg-[var(--char-2)]",
        "p-3 pl-4",
        "text-[13px] leading-[1.45] text-[var(--paper)]",
        "cursor-grab",
        "transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-out)]",
        "hover:border-[var(--gold)] hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:border-[var(--gold)] focus-visible:[box-shadow:var(--ring)]",
        "relative",
      ].join(" ")}
      style={isAttention ? { borderColor: "var(--danger-soft)" } : undefined}
    >
      {/* Faixa lateral 3px — accent da coluna. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-[var(--radius-sm)]"
        style={{ background: token.color }}
      />
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{ background: token.bg, color: token.color }}
        >
          {column?.title ?? "—"}
        </span>
        {isAttention ? (
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{
              background: "rgba(255,154,143,0.18)",
              color: "var(--danger-soft)",
            }}
          >
            Atenção
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 font-semibold tracking-[-0.005em] text-[var(--paper)]">
        {item.title}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--muted-on-dark)]">
        <User className="h-3 w-3" aria-hidden="true" />
        {item.assignee}
        <span aria-hidden="true">·</span>
        <Calendar className="h-3 w-3" aria-hidden="true" />
        {item.due}
      </div>
    </div>
  );
}
