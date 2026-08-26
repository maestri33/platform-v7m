"use client";

import type { CSSProperties, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";

import type { KanbanItem } from "./types";

/** Tipos do átomo. Genérico em T para preservar o shape do domínio. */
type KanbanCardProps<T extends KanbanItem> = {
  item: T;
  /** True quando ESTE card está sendo arrastado (some no lugar, vira overlay). */
  isDragging?: boolean;
  /** Projeção opcional de metadados (assignee, due, etc.) — chamada em runtime. */
  renderMeta?: (item: T) => ReactNode;
  /** Projeção opcional de tags (chips). */
  renderTags?: (item: T) => ReactNode;
};

/**
 * Átomo de card: superfície escura translúcida sobre a coluna glass, hover
 * eleva + borda dourada. Acessível (role + tabIndex) para teclado/screen
 * reader. Listeners e ref vêm do dnd-kit (useSortable).
 */
export function KanbanCard<T extends KanbanItem>({
  item,
  isDragging = false,
  renderMeta,
  renderTags,
}: KanbanCardProps<T>) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging: dndIsDragging,
  } = useSortable({
    id: item.id,
    data: { type: "card", columnId: item.columnId },
  });

  // Quando o card está no overlay, ele NÃO deve aparecer no lugar original.
  // Mantemos o espaço com `opacity-0` para não colapsar o layout da coluna.
  const hidden = isDragging || dndIsDragging;

  const style: CSSProperties = {
    // `useSortable` só devolve translate (sem scale) — equivale ao
    // `CSS.Transform.toString` do @dnd-kit/utilities, sem a dep extra.
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      aria-roledescription="kanban card"
      aria-grabbed={dndIsDragging || undefined}
      tabIndex={0}
      className={[
        "group block select-none",
        "rounded-[var(--radius-sm)]",
        "border border-white/8",
        "bg-[var(--char-2)]",
        "p-3",
        "text-[var(--paper)]",
        "text-[13px] leading-[1.45]",
        "cursor-grab",
        "transition-[transform,border-color,box-shadow] duration-200",
        "ease-[var(--ease-out)]",
        // Hover: eleva + borda gold (espelha `.a-card:hover` do mockup A).
        "hover:border-[var(--gold)] hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:border-[var(--gold)] focus-visible:[box-shadow:var(--ring)]",
        hidden ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      <div className="font-semibold tracking-[-0.005em] text-[var(--paper)]">
        {readTitle(item)}
      </div>

      {renderTags ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {renderTags(item)}
        </div>
      ) : null}

      {renderMeta ? (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--muted-on-dark)]">
          {renderMeta(item)}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Lê o título do card com fallback seguro (sem `any`). O índice aberto de
 * `KanbanItem` é tipado como `unknown`, então validamos em runtime.
 */
function readTitle(item: KanbanItem): string {
  const raw = (item as Record<string, unknown>).title;
  return typeof raw === "string" && raw.length > 0 ? raw : item.id;
}
