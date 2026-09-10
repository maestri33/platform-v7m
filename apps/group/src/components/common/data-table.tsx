import type { ReactNode } from "react";
import { EmptyState, LoadingState } from "@v7m/ui";

export interface Column<T> {
  /** Cabeçalho da coluna. */
  header: string;
  /** Render da célula a partir da linha. */
  cell: (row: T) => ReactNode;
  /** Classe extra na célula/cabeçalho (ex.: "text-right", "hidden sm:table-cell"). */
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | null;
  /** Chave estável por linha. */
  rowKey: (row: T, index: number) => string;
  /** true enquanto carrega (rows ainda null). */
  loading?: boolean;
  /** Mensagem quando não há linhas. */
  emptyLabel?: string;
  /** Clique na linha (opcional — vira cursor-pointer + hover). */
  onRowClick?: (row: T) => void;
}

/**
 * Tabela do admin — "liquid glass" clara, cabeçalho sticky, rola na horizontal
 * em telas estreitas (admin pode rolar — globals.css). Trata loading/empty num
 * só lugar pra toda lista (usuários, comissões, payouts, logs…).
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyLabel = "Nada por aqui ainda.",
  onRowClick,
}: DataTableProps<T>) {
  if (loading || rows === null) return <LoadingState />;
  if (rows.length === 0) return <EmptyState label={emptyLabel} />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white/70 shadow-xs backdrop-blur-md">
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-brand-border bg-white/60">
            {columns.map((c, i) => (
              <th
                key={i}
                scope="col"
                className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-brand-muted ${
                  c.className || ""
                }`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border/60">
          {rows.map((r, i) => {
            const key = rowKey(r, i);
            const clickable = Boolean(onRowClick);
            return (
              <tr
                key={key}
                onClick={clickable ? () => onRowClick!(r) : undefined}
                className={`transition-colors ${
                  clickable
                    ? "cursor-pointer hover:bg-brand-blue-bg/40 focus-visible:bg-brand-blue-bg/40 focus-visible:outline-none"
                    : "hover:bg-slate-50/60"
                }`}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick!(r);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((c, j) => (
                  <td
                    key={j}
                    className={`px-4 py-3.5 align-middle text-brand-ink ${c.className || ""}`}
                  >
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
