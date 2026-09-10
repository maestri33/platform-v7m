"use client";

import { useEffect, useState } from "react";

import { Card, ErrorBox, PageShell, StatusPill } from "@v7m/ui";
import { DataTable, type Column } from "@/components/common/data-table";
import { getErrorMessage } from "@/lib/api";

type Row = Record<string, unknown>;

/** Lê o primeiro campo presente como string. */
export function field(row: Row, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== "") return typeof v === "object" ? JSON.stringify(v) : String(v);
  }
  return "—";
}

interface GlobalListProps {
  title: string;
  subtitle: string;
  /** Busca as linhas com os filtros (hub/status). */
  fetcher: (opts: { hub?: string; status?: string }) => Promise<Row[]>;
  columns: Column<Row>[];
  /** Opções do filtro de status (vazio = sem filtro). */
  statusOptions?: { value: string; label: string }[];
  emptyLabel: string;
  /** Placeholder do filtro de hub (external_id digitado). */
  hubFilter?: boolean;
}

/**
 * Lista global do admin (alunos / matrículas / leads). Todas vêm UNTYPED do
 * backend (Record solto) — as colunas leem os campos defensivamente. Filtros
 * comuns: status (chips) e hub (external_id, opcional). Reusa DataTable.
 */
export function GlobalList({
  title,
  subtitle,
  fetcher,
  columns,
  statusOptions,
  emptyLabel,
  hubFilter = false,
}: GlobalListProps) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [hub, setHub] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher({ hub: hub.trim() || undefined, status: status || undefined })
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, status, hub]);

  return (
    <PageShell title={title} subtitle={subtitle}>
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {hubFilter ? (
            <input
              type="text"
              placeholder="Filtrar por ID do Hub…"
              value={hub}
              onChange={(e) => setHub(e.target.value)}
              className="h-10 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-ink placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          ) : null}
          {statusOptions && statusOptions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatus("")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  status === ""
                    ? "bg-brand-blue text-white"
                    : "bg-slate-100 text-brand-muted hover:bg-slate-200"
                }`}
              >
                Todos
              </button>
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    status === opt.value
                      ? "bg-brand-blue text-white"
                      : "bg-slate-100 text-brand-muted hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}
          {rows !== null ? (
            <span className="ml-auto text-xs font-semibold text-brand-muted">
              {rows.length} {rows.length === 1 ? "registro" : "registros"}
            </span>
          ) : null}
        </div>
      </Card>

      {error ? <ErrorBox message={error} className="mb-6" /> : null}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r, i) => String(r.id ?? r.uuid ?? i)}
        loading={loading}
        emptyLabel={emptyLabel}
      />
    </PageShell>
  );
}
