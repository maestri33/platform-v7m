"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { TextField } from "@/components/ui/text-field";
import {
  getFinanceCommissions,
  getFinancePayouts,
  type Commission,
  type Payout,
} from "@/lib/api";
import { formatBRL } from "@/lib/money";

/** Lê um campo de um Record solto como string amigável. */
function str(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== "") return String(v);
  }
  return "—";
}

function money(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== "" && Number.isFinite(Number(v))) return formatBRL(Number(v));
  }
  return "—";
}

function shortId(row: Record<string, unknown>): string {
  const id = str(row, "external_id", "id");
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

const PAYOUT_KINDS = [
  { value: "", label: "Todos os tipos" },
  { value: "commission", label: "Comissão" },
  { value: "fee", label: "Taxa" },
  { value: "manual", label: "Avulso" },
];

const STATUSES = [
  { value: "", label: "Todos os status" },
  { value: "pending", label: "Pendente" },
  { value: "processed", label: "Processado" },
  { value: "paid", label: "Pago" },
  { value: "failed", label: "Falhou" },
];

function Filter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-9 rounded-full px-3 py-1 text-[13px] font-bold transition ${
            value === o.value
              ? "bg-brand-blue text-white"
              : "bg-white/70 text-brand-muted ring-1 ring-brand-border hover:text-brand-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tabela de payouts (fila de saída) com filtros kind + status. */
export function PayoutsPanel() {
  const [rows, setRows] = useState<Payout[] | null>(null);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [retryExtId, setRetryExtId] = useState<string | null>(null);
  const [overridePix, setOverridePix] = useState<{ extId: string; pix: string } | null>(null);

  useEffect(() => {
    setRows(null);
    let cancelled = false;
    getFinancePayouts({ kind: kind || undefined, status: status || undefined })
      .then((d) => {
        if (!cancelled) setRows(d);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, status]);

  async function handleConfirmRetry() {
    if (!retryExtId) return;
    try {
      const { retryPayout } = await import("@/lib/api");
      await retryPayout(retryExtId);
      toast.success("Pagamento reenfileirado para envio PIX.");
      setRetryExtId(null);
      const d = await getFinancePayouts({ kind: kind || undefined, status: status || undefined });
      setRows(d);
    } catch (e: unknown) {
      toast.error("Erro: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function handleConfirmOverridePix() {
    if (!overridePix || !overridePix.pix.trim()) {
      throw new Error("Informe uma chave PIX válida.");
    }
    try {
      const { overridePayoutPix } = await import("@/lib/api");
      await overridePayoutPix(overridePix.extId, overridePix.pix.trim(), true);
      toast.success("Chave PIX atualizada e pagamento reenfileirado.");
      setOverridePix(null);
      const d = await getFinancePayouts({ kind: kind || undefined, status: status || undefined });
      setRows(d);
    } catch (e: unknown) {
      toast.error("Erro: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  const columns: Column<Payout>[] = [
    { header: "ID", cell: (r) => <span className="font-mono text-[12px]">{shortId(r)}</span> },
    { header: "Tipo", cell: (r) => str(r, "kind") },
    { header: "Método", cell: (r) => str(r, "method") },
    { header: "Beneficiário", cell: (r) => str(r, "payee_name", "supplier_name", "beneficiary", "description"), className: "max-w-[220px] truncate" },
    { header: "Chave PIX", cell: (r) => <span className="font-mono text-xs">{str(r, "pix_key")}</span> },
    { header: "Valor", cell: (r) => money(r, "amount", "value"), className: "text-right font-bold" },
    { header: "Status", cell: (r) => <StatusPill status={str(r, "status")} /> },
    {
      header: "Ações",
      className: "text-right",
      cell: (r) => {
        const extId = str(r, "external_id", "id");
        const st = str(r, "status");
        const pix = str(r, "pix_key");
        return (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => setOverridePix({ extId, pix: pix === "—" ? "" : pix })}
              className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-brand-ink hover:bg-slate-200 cursor-pointer"
              title="Corrigir Chave PIX"
            >
              PIX
            </button>
            {st !== "paid" && (
              <button
                onClick={() => setRetryExtId(extId)}
                className="rounded bg-brand-blue px-2 py-1 text-[11px] font-bold text-white hover:bg-brand-blue/90 cursor-pointer"
                title="Tentar Novamente"
              >
                Retry
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Filter value={kind} onChange={setKind} options={PAYOUT_KINDS} />
        <Filter value={status} onChange={setStatus} options={STATUSES} />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r, i) => str(r, "external_id", "id") + i}
        emptyLabel="Nenhum pagamento na fila com esses filtros."
      />

      {/* Confirmação de Retry */}
      <ConfirmDialog
        open={retryExtId !== null}
        title="Reprocessar Pagamento"
        body="Deseja reenfileirar este pagamento para reprocessamento imediato no gateway?"
        confirmLabel="Reprocessar Agora"
        tone="primary"
        onCancel={() => setRetryExtId(null)}
        onConfirm={handleConfirmRetry}
      />

      {/* Modal de Atualização de Chave PIX */}
      <ConfirmDialog
        open={overridePix !== null}
        title="Corrigir Chave PIX"
        confirmLabel="Salvar e Reenfileirar"
        tone="primary"
        onCancel={() => setOverridePix(null)}
        onConfirm={handleConfirmOverridePix}
        body={
          <div className="space-y-3 pt-1">
            <p className="text-xs text-brand-muted">
              Informe a nova chave PIX para envio do pagamento:
            </p>
            <TextField
              label="Chave PIX (CPF, Celular, E-mail ou Aleatória)"
              placeholder="Digite a chave PIX..."
              value={overridePix?.pix ?? ""}
              onChange={(e) =>
                setOverridePix((prev) => (prev ? { ...prev, pix: e.target.value } : null))
              }
            />
          </div>
        }
      />
    </Card>
  );
}

/** Tabela de comissões com filtro de status. */
export function CommissionsPanel() {
  const [rows, setRows] = useState<Commission[] | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setRows(null);
    let cancelled = false;
    getFinanceCommissions(status || undefined)
      .then((d) => {
        if (!cancelled) setRows(d);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const columns: Column<Commission>[] = [
    { header: "ID", cell: (r) => <span className="font-mono text-[12px]">{shortId(r)}</span> },
    { header: "Beneficiário", cell: (r) => str(r, "beneficiary_name", "promoter_name", "supplier_name", "beneficiary"), className: "max-w-[220px] truncate" },
    { header: "Origem", cell: (r) => str(r, "origin", "source", "reference") },
    { header: "Valor", cell: (r) => money(r, "amount", "value"), className: "text-right font-bold" },
    { header: "Status", cell: (r) => <StatusPill status={str(r, "status")} /> },
  ];

  return (
    <Card className="flex flex-col gap-4">
      <Filter value={status} onChange={setStatus} options={STATUSES} />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r, i) => str(r, "external_id", "id") + i}
        emptyLabel="Nenhuma comissão com esse status."
      />
    </Card>
  );
}

export { str, money };
