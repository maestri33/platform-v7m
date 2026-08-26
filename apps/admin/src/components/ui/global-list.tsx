"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorBox } from "@/components/ui/error-box";
import { PageShell } from "@/components/ui/page-shell";
import { StatusPill } from "@/components/ui/status-pill";
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
  const [status, setStatus] = useState("");
  const [hub, setHub] = useState("");
  const [appliedHub, setAppliedHub] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    setError(null);
    let cancelled = false;
    fetcher({ status: status || undefined, hub: appliedHub || undefined })
      .then((d) => {
        if (!cancelled) setRows(d);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(e));
        setRows([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, appliedHub]);

  return (
    <PageShell title={title} subtitle={subtitle}>
      <ErrorBox message={error} />
      <Card className="mb-4 flex flex-col gap-3" pad="sm">
        {statusOptions && statusOptions.length ? (
          <div className="flex flex-wrap gap-1.5">
            {[{ value: "", label: "Todos" }, ...statusOptions].map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setStatus(o.value)}
                className={`min-h-9 rounded-full px-3 py-1 text-[13px] font-bold transition ${
                  status === o.value ? "bg-brand-blue text-white" : "bg-white/70 text-brand-muted ring-1 ring-brand-border hover:text-brand-ink"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : null}
        {hubFilter ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedHub(hub.trim());
            }}
          >
            <input
              value={hub}
              onChange={(e) => setHub(e.target.value)}
              placeholder="Filtrar por polo (external_id)"
              className="min-h-10 flex-1 rounded-xl border-2 border-brand-border bg-white/60 px-3 text-[14px] outline-none focus:border-brand-blue-bright"
            />
            <button type="submit" className="min-h-10 rounded-xl bg-brand-blue px-4 text-[14px] font-bold text-white">
              Filtrar
            </button>
          </form>
        ) : null}
      </Card>

      <DataTable columns={columns} rows={rows} rowKey={(r, i) => field(r, "external_id", "id") + i} emptyLabel={emptyLabel} />
    </PageShell>
  );
}

export { StatusPill };
