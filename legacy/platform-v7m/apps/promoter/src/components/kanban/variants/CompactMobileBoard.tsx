"use client";

import { ChevronDown, Paperclip, Tag as TagIcon, User } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { KanbanBoard } from "../KanbanBoard";
import type { KanbanColumnDef, KanbanItem } from "../types";
import { Avatar } from "./Avatar";
import type { KanbanAssignee, KanbanCardState } from "./types";
import { useMediaQuery } from "./use-media-query";

/**
 * Board "compact": em viewport ≤ md, cada card vira um strip fino
 * (avatar + título truncado + estado + chevron). Click expande para
 * a versão completa com `motion` (altura animada, transição suave).
 * Em viewport ≥ md, renderiza o card completo direto.
 *
 * Foco: UX de touch em lista (similar a notification/inbox mobile).
 * Drop-in: substitui o `KanbanBoard` no consumidor.
 */
export type CompactItem = KanbanItem & {
  title: string;
  assignee: KanbanAssignee;
  due: string;
  tags?: { label: string; tone?: "gold" | "ok" | "info" | "muted" }[];
  attachments?: number;
  state?: KanbanCardState;
};

export function KanbanCompactMobileBoard({
  items,
  columns,
  onMove,
}: {
  items: CompactItem[];
  columns: KanbanColumnDef[];
  onMove?: (id: string, from: string, to: string) => void;
}) {
  return (
    <KanbanBoard<CompactItem>
      columns={columns}
      items={items}
      onMove={onMove}
      renderCard={(item) => <CompactCard item={item} />}
    />
  );
}

const STATE_DOT: Record<NonNullable<CompactItem["state"]>, string> = {
  default: "rgba(255,255,255,0.25)",
  attention: "var(--danger-soft)",
  success: "var(--ok-soft)",
  info: "var(--info-soft)",
  muted: "var(--muted-on-dark)",
};

const STATE_BG: Record<NonNullable<CompactItem["state"]>, string> = {
  default: "rgba(255,255,255,0.04)",
  attention: "rgba(192, 57, 43, 0.08)",
  success: "rgba(47, 143, 91, 0.08)",
  info: "rgba(47, 111, 176, 0.08)",
  muted: "rgba(255, 255, 255, 0.03)",
};

function CompactCard({ item }: { item: CompactItem }) {
  const reduceMotion = useReducedMotion();
  // Hook dentro de componente client — assume que KanbanBoard
  // renderiza este card só no cliente (✓ — `'use client'`).
  const isCompact = useMediaQuery("(max-width: 767px)");
  // `expanded` é estado de UI local. Em desktop o branch de render
  // ignora esse estado, então não precisamos sincronizar/reseta-lo
  // quando o viewport muda — basta renderizar condicionalmente.
  const [expanded, setExpanded] = useState(false);

  const state = item.state ?? "default";
  const isAttention = state === "attention";

  // Estado compacto (mobile): strip horizontal, 56px, expansível.
  if (isCompact) {
    return (
      <div
        className={[
          "rounded-[var(--radius-sm)] border",
          "transition-colors duration-200 ease-[var(--ease-out)]",
          isAttention
            ? "border-[var(--danger-soft)]"
            : "border-white/8 hover:border-[var(--gold)]",
        ].join(" ")}
        style={{ background: STATE_BG[state] }}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`compact-panel-${item.id}`}
          aria-label={`${item.title}, ${expanded ? "recolher" : "expandir"} detalhes`}
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
        >
          <Avatar assignee={item.assignee} size={28} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[var(--paper)]">
              {item.title}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--muted-on-dark)]">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: STATE_DOT[state] }}
              />
              {item.due}
              {item.attachments ? (
                <>
                  <span aria-hidden="true">·</span>
                  <Paperclip className="h-3 w-3" aria-hidden="true" />
                  {item.attachments}
                </>
              ) : null}
            </span>
          </span>
          <motion.span
            aria-hidden="true"
            animate={
              reduceMotion
                ? undefined
                : { rotate: expanded ? 180 : 0 }
            }
            transition={{ duration: 0.2 }}
            className="text-[var(--muted-on-dark)]"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="panel"
              id={`compact-panel-${item.id}`}
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { height: 0, opacity: 0 }
              }
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : { height: "auto", opacity: 1 }
              }
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { height: 0, opacity: 0 }
              }
              transition={
                reduceMotion
                  ? { duration: 0.1 }
                  : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
              }
              className="overflow-hidden border-t border-white/8"
            >
              <div className="space-y-2 px-3 py-2.5 text-[12px] text-[var(--muted-on-dark)]">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" aria-hidden="true" />
                  {item.assignee.name}
                </div>
                {item.tags && item.tags.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <TagIcon
                      className="h-3 w-3 text-[var(--muted-on-dark)]"
                      aria-hidden="true"
                    />
                    {item.tags.map((t) => (
                      <span
                        key={t.label}
                        className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: "var(--muted-on-dark)",
                        }}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {isAttention ? (
                  <div
                    className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                    style={{
                      background: "rgba(255,154,143,0.18)",
                      color: "var(--danger-soft)",
                    }}
                  >
                    Atenção
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop: card completo (mesmo padrão do default KanbanCard).
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
        "p-3",
        "text-[13px] leading-[1.45] text-[var(--paper)]",
        "cursor-grab",
        "transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-out)]",
        "hover:border-[var(--gold)] hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:border-[var(--gold)] focus-visible:[box-shadow:var(--ring)]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <Avatar assignee={item.assignee} size={24} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold tracking-[-0.005em] text-[var(--paper)]">
            {item.title}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--muted-on-dark)]">
            {item.assignee.name}
            <span aria-hidden="true">·</span>
            {item.due}
            {isAttention ? (
              <span
                className="ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{
                  background: "rgba(255,154,143,0.18)",
                  color: "var(--danger-soft)",
                }}
              >
                Atenção
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
