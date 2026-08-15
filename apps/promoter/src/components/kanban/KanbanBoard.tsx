"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { motion, useReducedMotion } from "motion/react";

import type { KanbanColumnDef, KanbanItem } from "./types";
import { KanbanCard } from "./KanbanCard";
import { KanbanColumn } from "./KanbanColumn";

/** Props do orquestrador. */
export type KanbanBoardProps<T extends KanbanItem> = {
  columns: KanbanColumnDef[];
  items: T[];
  /** Callback quando um item troca de coluna (origem → destino). */
  onMove?: (itemId: string, fromColumnId: string, toColumnId: string) => void;
  /** Substitui o card default. Útil para casos com layout próprio. */
  renderCard?: (item: T) => ReactNode;
  /** Repassa ao KanbanCard default (metadados: assignee, due…). */
  renderMeta?: (item: T) => ReactNode;
  /** Repassa ao KanbanCard default (chips de tag). */
  renderTags?: (item: T) => ReactNode;
};

/**
 * Orquestrador do board. Single source of truth para `items` (useState
 * inicializado a partir do prop) — o board se vira sozinho para o demo.
 * Em produção, o pai deve controlar `items` + repassar via `onMove` para
 * uma store / API. Para resetar o board a partir do pai, basta remontá-lo
 * (passar um `key` novo).
 *
 * Responsivo:
 *   - ≥ md: 3 colunas em grid (1 / 2 / 3 colunas por breakpoint).
 *   - < md: container `flex overflow-x-auto snap-x` com cada coluna em
 *     84% da largura, dots de paginação abaixo.
 *
 * Drag-and-drop: pointer + touch (com delay pra não roubar scroll) +
 * keyboard. DragOverlay usa motion com spring, escalado 1.02 e sombra
 * elevada — visualmente "o card levanta da coluna".
 */
export function KanbanBoard<T extends KanbanItem>({
  columns,
  items: itemsProp,
  onMove,
  renderCard,
  renderMeta,
  renderTags,
}: KanbanBoardProps<T>) {
  // Estado interno inicializado uma vez a partir do prop. Sem
  // useEffect-de-sync (lint `react-hooks/set-state-in-effect`).
  const [items, setItems] = useState<T[]>(itemsProp);

  const [activeId, setActiveId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  // `id` estável pro DndContext — sem isso, o @dnd-kit gera um contador
  // global (`DndDescribedBy-N`) que difere entre SSR e CSR e dispara
  // hydration mismatch no atributo `aria-describedby` dos cards.
  const dndId = useId();

  // Indexa items por id para lookup O(1) no drag.
  const itemsById = useMemo(() => {
    const m = new Map<string, T>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  // Agrupa items por coluna (preserva ordem dos items em `items`).
  const byColumn = useMemo(() => {
    const m = new Map<string, T[]>();
    for (const c of columns) m.set(c.id, []);
    for (const it of items) {
      const arr = m.get(it.columnId);
      if (arr) arr.push(it);
    }
    return m;
  }, [items, columns]);

  // Sensores: pointer (mouse) com distance threshold, touch com delay
  // pra permitir scroll vertical antes do drag, keyboard para a11y.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      // 150ms + 5px de tolerância: se o usuário rolar a página, NÃO
      // dispara o drag (touch + scroll horizontal da coluna ainda
      // funciona porque o scroll vertical "vence" o delay).
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Resolver coluna destino: pode ser uma coluna (drop vazio) ou um
  // card (drop em cima de outro card) → herdamos a coluna do card.
  const resolveTargetColumnId = useCallback(
    (overId: string, allItems: Map<string, T>): string | null => {
      if (allItems.has(overId)) {
        return allItems.get(overId)?.columnId ?? null;
      }
      if (columns.some((c) => c.id === overId)) return overId;
      return null;
    },
    [columns],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeItem = itemsById.get(String(active.id));
    if (!activeItem) return;

    const targetColumnId = resolveTargetColumnId(
      String(over.id),
      itemsById,
    );
    if (!targetColumnId) return;
    if (targetColumnId === activeItem.columnId) return; // mesma coluna → no-op

    const fromColumnId = activeItem.columnId;
    setItems((prev) =>
      prev.map((it) =>
        it.id === activeItem.id
          ? ({ ...it, columnId: targetColumnId } as T)
          : it,
      ),
    );
    onMove?.(activeItem.id, fromColumnId, targetColumnId);
  };

  // ---------- Dots mobile (snap indicator) ----------
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeSnapIndex, setActiveSnapIndex] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      // 1 coluna por "página" do snap. Largura do scroller = coluna + gap.
      // `firstElementChild.clientWidth` é a largura de UM card de coluna.
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      const step = first.offsetWidth + 12; // gap-3 = 12px
      const idx = Math.round(el.scrollLeft / step);
      setActiveSnapIndex(Math.max(0, Math.min(columns.length - 1, idx)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [columns.length]);

  // Renderiza o card no DragOverlay — espelha o card default. O overlay
  // precisa do `item`, então buscamos em `itemsById`.
  const activeItem = activeId ? itemsById.get(activeId) : null;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="w-full">
        {/* Stage com aurora sutil (radial gold 20% no topo) — espelha
            o `.a-stage` do mockup A para o "uau" do glass. */}
        <div
          className="relative overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            background:
              "radial-gradient(60% 80% at 20% 0%, rgba(217,177,90,0.20), transparent 60%), radial-gradient(50% 70% at 90% 30%, rgba(176,127,48,0.16), transparent 60%), var(--char)",
            padding: "clamp(16px, 3vw, 28px)",
          }}
        >
          {/* Scroller mobile / grid desktop: mesmo DOM, classes
              responsive do Tailwind. Em `flex` (mobile), `flex-[0_0_84%]
              snap-center` dá o efeito do mockup. Em `md:grid`, vira
              coluna do grid 1/2/3. */}
          <div
            ref={scrollerRef}
            className={[
              "flex flex-nowrap gap-3",
              "overflow-x-auto snap-x snap-mandatory",
              "md:grid md:overflow-visible md:snap-none",
              "md:grid-cols-2 lg:grid-cols-3",
              // Esconde scrollbar visualmente (mobile).
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            ].join(" ")}
          >
            {columns.map((column) => (
              <div
                key={column.id}
                className={[
                  "shrink-0 basis-[84%] snap-center",
                  "md:basis-auto md:snap-align-none",
                  "min-h-[440px]",
                ].join(" ")}
              >
                <KanbanColumn
                  column={column}
                  items={byColumn.get(column.id) ?? []}
                  renderCard={renderCard}
                  renderMeta={renderMeta}
                  renderTags={renderTags}
                />
              </div>
            ))}
          </div>

          {/* Dots de paginação — mobile only. */}
          <div
            aria-hidden="true"
            className="mt-3 flex items-center justify-center gap-1.5 md:hidden"
          >
            {columns.map((c, i) => {
              const active = i === activeSnapIndex;
              return (
                <span
                  key={c.id}
                  className={[
                    "block rounded-full transition-all duration-200",
                    active
                      ? "h-1.5 w-[18px] bg-[var(--gold)]"
                      : "h-1.5 w-1.5 bg-white/20",
                  ].join(" ")}
                />
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay
        dropAnimation={
          reduceMotion
            ? null
            : { duration: 220, easing: "cubic-bezier(0.16,1,0.3,1)" }
        }
      >
        {activeItem ? (
          <motion.div
            initial={reduceMotion ? false : { scale: 1, rotate: 0 }}
            animate={reduceMotion ? undefined : { scale: 1.02, rotate: -1.5 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 28 }
            }
            style={{
              boxShadow:
                "0 24px 60px -18px rgba(0,0,0,0.55), 0 4px 12px -4px rgba(217,177,90,0.25)",
              cursor: "grabbing",
            }}
          >
            <KanbanCard
              item={activeItem}
              isDragging
              renderMeta={renderMeta}
              renderTags={renderTags}
            />
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
