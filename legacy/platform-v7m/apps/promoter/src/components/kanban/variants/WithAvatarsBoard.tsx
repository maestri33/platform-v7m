"use client";

import { Calendar } from "lucide-react";

import { KanbanBoard } from "../KanbanBoard";
import type { KanbanColumnDef, KanbanItem } from "../types";
import type { KanbanAssignee } from "./types";
import { Avatar, AvatarStack } from "./Avatar";

/**
 * Board com cards que exibem foto/iniciais do(s) responsável(eis).
 * O item precisa carregar `assignee: KanbanAssignee` (avatar opcional)
 * e opcionalmente `assignees: KanbanAssignee[]` para grupo.
 *
 * Drop-in: usar no lugar do KanbanBoard padrão.
 */
export type WithAvatarItem = KanbanItem & {
  title: string;
  assignee: KanbanAssignee;
  assignees?: KanbanAssignee[];
  due: string;
};

export function KanbanWithAvatarsBoard({
  items,
  columns,
  onMove,
}: {
  items: WithAvatarItem[];
  columns: KanbanColumnDef[];
  onMove?: (id: string, from: string, to: string) => void;
}) {
  return (
    <KanbanBoard<WithAvatarItem>
      columns={columns}
      items={items}
      onMove={onMove}
      renderCard={(item) => <AvatarCard item={item} />}
    />
  );
}

function AvatarCard({ item }: { item: WithAvatarItem }) {
  const hasGroup = !!item.assignees && item.assignees.length > 0;
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
        "transition-[transform,border-color,box-shadow] duration-200",
        "ease-[var(--ease-out)]",
        "hover:border-[var(--gold)] hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:border-[var(--gold)] focus-visible:[box-shadow:var(--ring)]",
      ].join(" ")}
    >
      <div className="font-semibold tracking-[-0.005em] text-[var(--paper)]">
        {item.title}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--muted-on-dark)]">
        {hasGroup ? (
          <AvatarStack assignees={item.assignees ?? []} max={3} size={20} />
        ) : (
          <Avatar assignee={item.assignee} size={20} />
        )}
        <span className="truncate">{item.assignee.name}</span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <Calendar className="h-3 w-3" aria-hidden="true" />
          {item.due}
        </span>
      </div>
    </div>
  );
}
