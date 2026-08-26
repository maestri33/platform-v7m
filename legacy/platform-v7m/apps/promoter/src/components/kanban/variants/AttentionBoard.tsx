"use client";

import { AlertCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { KanbanBoard } from "../KanbanBoard";
import type { KanbanColumnDef, KanbanItem } from "../types";
import type { KanbanCardState } from "./types";

/**
 * Card com estado de atenção. Quando `state === "attention"`, ganha
 * borda + glow vermelho e um ícone de alerta. Outros estados recebem
 * um tratamento mais sutil (info/success/muted/default).
 *
 * Drop-in: trocar o `KanbanBoard` por `KanbanAttentionBoard` no
 * consumidor. Requer que o item tenha um campo `state?: KanbanCardState`.
 */
export type AttentionItem = KanbanItem & {
  state?: KanbanCardState;
  title: string;
};

export function KanbanAttentionBoard({
  items,
  columns,
  onMove,
}: {
  items: AttentionItem[];
  columns: KanbanColumnDef[];
  onMove?: (id: string, from: string, to: string) => void;
}) {
  return (
    <KanbanBoard<AttentionItem>
      columns={columns}
      items={items}
      onMove={onMove}
      renderCard={(item) => <AttentionCard item={item} />}
    />
  );
}

function AttentionCard({ item }: { item: AttentionItem }) {
  const reduceMotion = useReducedMotion();
  const isAttention = item.state === "attention";

  // Glow + borda vermelhos. Intensidade calibrada p/ ler no escuro
  // sem estourar contraste (caixa de cor vem de `var(--danger-soft)`).
  const attentionStyle: React.CSSProperties | undefined = isAttention
    ? {
        borderColor: "var(--danger-soft)",
        boxShadow:
          "0 0 0 1px rgba(255,154,143,0.30), 0 10px 28px -10px rgba(255,107,107,0.45)",
        background: "rgba(192, 57, 43, 0.06)",
      }
    : undefined;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-roledescription="kanban card"
      aria-label={
        isAttention
          ? `${readTitle(item)}, requer atenção`
          : readTitle(item)
      }
      animate={
        isAttention && !reduceMotion
          ? { boxShadow: [
              "0 0 0 1px rgba(255,154,143,0.30), 0 10px 28px -10px rgba(255,107,107,0.45)",
              "0 0 0 1px rgba(255,154,143,0.45), 0 14px 32px -10px rgba(255,107,107,0.55)",
              "0 0 0 1px rgba(255,154,143,0.30), 0 10px 28px -10px rgba(255,107,107,0.45)",
            ] }
          : undefined
      }
      transition={
        isAttention && !reduceMotion
          ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0 }
      }
      className={[
        "group block select-none",
        "rounded-[var(--radius-sm)]",
        "border border-white/8",
        "bg-[var(--char-2)]",
        "p-3",
        "text-[13px] leading-[1.45] text-[var(--paper)]",
        "cursor-grab",
        "transition-[border-color,background-color] duration-200 ease-[var(--ease-out)]",
        "hover:border-[var(--gold)]",
        "focus-visible:outline-none focus-visible:border-[var(--gold)] focus-visible:[box-shadow:var(--ring)]",
      ].join(" ")}
      style={attentionStyle}
    >
      <div className="flex items-start gap-2">
        {isAttention ? (
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(255,154,143,0.18)", color: "var(--danger-soft)" }}
          >
            <AlertCircle className="h-3 w-3" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="font-semibold tracking-[-0.005em] text-[var(--paper)]">
            {readTitle(item)}
          </div>
          {isAttention ? (
            <div
              className="mt-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ background: "rgba(255,154,143,0.16)", color: "var(--danger-soft)" }}
            >
              Atenção
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function readTitle(item: AttentionItem): string {
  return item.title || item.id;
}

export type { KanbanCardState } from "./types";
