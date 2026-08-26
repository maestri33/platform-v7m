import type { ReactNode } from "react";

import { EmptyState, LoadingState } from "@/components/ui/spinner";

export interface Column<T> {
  /** Cabeçalho da coluna. */
  header: string;
  /** Render da célula a partir da linha. */
  cell: (row: T) => ReactNode;
  /** Classe extra na célula/cabeçalho (ex.: "text-right", "hidden sm:table-cell"). */
  className?: string;
}

interface DataTableProps<T> {
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
    <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white/70 shadow-sm backdrop-blur-md">
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-brand-border bg-white/60">
            {columns.map((c, i) => (
              <th
                key={i}
                className={`sticky top-0 whitespace-nowrap px-4 py-3 text-[12px] font-extrabold uppercase tracking-wide text-brand-muted ${c.className ?? ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={rowKey(row, idx)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-brand-border/60 last:border-0 ${
                onRowClick ? "cursor-pointer transition hover:bg-brand-blue-bg/50" : ""
              }`}
            >
              {columns.map((c, i) => (
                <td key={i} className={`px-4 py-3 align-middle text-brand-ink ${c.className ?? ""}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
