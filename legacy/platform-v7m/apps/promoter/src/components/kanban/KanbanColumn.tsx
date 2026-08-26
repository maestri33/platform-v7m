"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { KanbanColumnDef, KanbanItem } from "./types";
import { KanbanCard } from "./KanbanCard";

/** Props da coluna glass. */
type KanbanColumnProps<T extends KanbanItem> = {
  column: KanbanColumnDef;
  items: T[];
  /** Projeção custom do card (substitui o KanbanCard default). */
  renderCard?: (item: T) => ReactNode;
  /** Repassa para o KanbanCard default. */
  renderMeta?: (item: T) => ReactNode;
  /** Repassa para o KanbanCard default. */
  renderTags?: (item: T) => ReactNode;
};

/**
 * Coluna glass do kanban. A própria coluna é o alvo de drop (id da coluna) —
 * assim conseguimos mover cards para colunas VAZIAS. Cada card dentro é
 * sortable (SortableContext com estratégia vertical).
 */
export function KanbanColumn<T extends KanbanItem>({
  column,
  items,
  renderCard,
  renderMeta,
  renderTags,
}: KanbanColumnProps<T>) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  const ids = items.map((i) => i.id);

  return (
    <section
      aria-label={`${column.title}, ${items.length} ${items.length === 1 ? "item" : "itens"}`}
      className="flex h-full flex-col"
    >
      {/* Coluna glass: blur + borda translúcida sobre a aurora do stage. */}
      <div
        ref={setNodeRef}
        data-column-id={column.id}
        className={[
          "flex h-full flex-col gap-3",
          "p-[14px]",
          "rounded-[var(--radius)]",
          "border",
          isOver
            ? "border-[var(--gold)] [box-shadow:0_0_0_1px_var(--gold)]"
            : "border-white/8",
        ].join(" ")}
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
        }}
      >
        <header className="flex items-center justify-between gap-2">
          <h3
            className={[
              "m-0 text-[12px] font-semibold uppercase",
              "tracking-[0.12em] text-[var(--paper)]",
              "flex items-center gap-2",
            ].join(" ")}
          >
            <span>{column.title}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-normal normal-case"
              style={{
                background: "rgba(217, 177, 90, 0.12)",
                color: "var(--gold-soft)",
              }}
            >
              {items.length}
            </span>
          </h3>
        </header>

        {/* Área de drop — `min-h` garante hit-target mesmo vazia. */}
        <div className="flex min-h-[60px] flex-col gap-3">
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {items.length === 0 ? (
              <EmptyColumnHint />
            ) : (
              items.map((item) =>
                renderCard ? (
                  <span key={item.id} className="contents">
                    {renderCard(item)}
                  </span>
                ) : (
                  <KanbanCard
                    key={item.id}
                    item={item}
                    renderMeta={renderMeta}
                    renderTags={renderTags}
                  />
                ),
              )
            )}
          </SortableContext>
        </div>
      </div>
    </section>
  );
}

/** Placeholder discreto para coluna vazia (sinaliza hit-area de drop). */
function EmptyColumnHint() {
  return (
    <div
      aria-hidden="true"
      className={[
        "min-h-[60px] rounded-[var(--radius-sm)]",
        "border border-dashed border-white/10",
        "flex items-center justify-center",
        "text-[11px] uppercase tracking-[0.14em]",
        "text-[var(--muted-on-dark)]",
      ].join(" ")}
    >
      Soltar aqui
    </div>
  );
}
