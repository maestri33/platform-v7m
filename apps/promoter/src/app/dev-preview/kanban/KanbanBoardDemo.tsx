"use client";

import { useCallback, useState } from "react";
import { Calendar, Paperclip, Tag as TagIcon, User } from "lucide-react";

import {
  KanbanBoard,
  type KanbanColumnDef,
  type KanbanItem,
} from "@/components/kanban";

/** Forma concreta do item de demo: 1 item do kanban genérico + meta. */
type DemoItem = KanbanItem & {
  title: string;
  tags: { label: string; tone: "gold" | "ok" | "info" | "muted" }[];
  assignee: string;
  due: string;
  priority?: "alta" | "média" | "baixa";
};

const COLUMNS: KanbanColumnDef[] = [
  { id: "todo", title: "A fazer", accent: "muted" },
  { id: "doing", title: "Em andamento", accent: "info" },
  { id: "done", title: "Concluído", accent: "ok" },
];

/** Sample data espelhando o mockup A (.a-stage desktop). */
const INITIAL_ITEMS: DemoItem[] = [
  // A fazer (4)
  {
    id: "i-1",
    columnId: "todo",
    title: "Definir política de pricing para o trimestre",
    tags: [{ label: "financeiro", tone: "gold" }],
    assignee: "Marina C.",
    due: "sexta",
    priority: "alta",
  },
  {
    id: "i-2",
    columnId: "todo",
    title: "Benchmark de fornecedores de hospedagem",
    tags: [{ label: "operação", tone: "info" }],
    assignee: "Pedro A.",
    due: "próxima semana",
  },
  {
    id: "i-3",
    columnId: "todo",
    title: "Revisar contrato com a adquirente",
    tags: [{ label: "jurídico", tone: "muted" }],
    assignee: "Lia F.",
    due: "10/ago",
    priority: "alta",
  },
  {
    id: "i-4",
    columnId: "todo",
    title: "Roteiro de onboarding para novos revendedores",
    tags: [{ label: "marketing", tone: "ok" }],
    assignee: "Tiago R.",
    due: "20/ago",
  },

  // Em andamento (3)
  {
    id: "i-5",
    columnId: "doing",
    title: "Migração do banco de leads para Postgres",
    tags: [{ label: "engenharia", tone: "info" }],
    assignee: "Bruno S.",
    due: "12/ago",
    priority: "alta",
  },
  {
    id: "i-6",
    columnId: "doing",
    title: "Testes A/B do novo checkout",
    tags: [{ label: "growth", tone: "gold" }],
    assignee: "Camila V.",
    due: "qua",
  },
  {
    id: "i-7",
    columnId: "doing",
    title: "Atualizar página de produto",
    tags: [{ label: "design", tone: "ok" }],
    assignee: "Helena P.",
    due: "15/ago",
  },

  // Concluído (2)
  {
    id: "i-8",
    columnId: "done",
    title: "Auditoria de segurança Q2",
    tags: [{ label: "segurança", tone: "muted" }],
    assignee: "Diego M.",
    due: "concluído",
  },
  {
    id: "i-9",
    columnId: "done",
    title: "Workshop de Vendas — junho",
    tags: [{ label: "comercial", tone: "ok" }],
    assignee: "Sofia L.",
    due: "concluído",
  },
];

/**
 * Wrapper client do demo. O `KanbanBoard` é uncontrolled (mantém o
 * estado interno a partir do `items` inicial) — aqui só registramos
 * o último `onMove` para dar feedback visual de que a callback
 * disparou. Em produção, esta callback despacharia para a store/API
 * e a store devolveria o novo `items` por prop.
 */
export function KanbanBoardDemo() {
  const [lastMove, setLastMove] = useState<string | null>(null);

  const handleMove = useCallback(
    (itemId: string, fromColumnId: string, toColumnId: string) => {
      setLastMove(`${itemId}: ${fromColumnId} → ${toColumnId}`);
    },
    [],
  );

  return (
    <div className="space-y-4">
      <KanbanBoard<DemoItem>
        columns={COLUMNS}
        items={INITIAL_ITEMS}
        onMove={handleMove}
        renderTags={renderTags}
        renderMeta={renderMeta}
      />

      {lastMove ? (
        <p
          aria-live="polite"
          className="text-[12px] text-[var(--surface-text-muted)]"
        >
          Último move: <code className="rounded bg-white/5 px-1.5 py-0.5">{lastMove}</code>
        </p>
      ) : null}
    </div>
  );
}

/** Renderiza os chips de tag com o tom certo (mesmo padrão do mockup). */
function renderTags(item: DemoItem) {
  if (!item.tags?.length) return null;
  return item.tags.map((t) => (
    <span
      key={t.label}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={tagStyle(t.tone)}
    >
      <TagIcon className="h-2.5 w-2.5" aria-hidden="true" />
      {t.label}
    </span>
  ));
}

function tagStyle(tone: "gold" | "ok" | "info" | "muted"): React.CSSProperties {
  switch (tone) {
    case "gold":
      return {
        background: "rgba(217,177,90,0.18)",
        color: "var(--gold-soft)",
      };
    case "ok":
      return {
        background: "rgba(47,143,91,0.20)",
        color: "var(--ok-soft)",
      };
    case "info":
      return {
        background: "rgba(47,111,176,0.20)",
        color: "var(--info-soft)",
      };
    case "muted":
    default:
      return {
        background: "rgba(255,255,255,0.06)",
        color: "var(--muted-on-dark)",
      };
  }
}

/** Linha de metadados: assignee · due (+ anexos quando for o caso). */
function renderMeta(item: DemoItem) {
  return (
    <>
      <span className="inline-flex items-center gap-1">
        <User className="h-3 w-3" aria-hidden="true" />
        {item.assignee}
      </span>
      <span aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1">
        <Calendar className="h-3 w-3" aria-hidden="true" />
        {item.due}
      </span>
      {/* Card #1 do mockup tem "2 anexos" — espelhamos o detalhe. */}
      {item.id === "i-1" ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3 w-3" aria-hidden="true" />
            2 anexos
          </span>
        </>
      ) : null}
    </>
  );
}
