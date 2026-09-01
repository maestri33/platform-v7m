"use client";

import { Card } from "@v7m/ui";
import type { StudentPendency } from "@/lib/api";

interface PendencyListProps {
  pendencies: StudentPendency[];
}

/** Rótulo amigável por tipo de pendência. O back manda texto livre; cobrimos os conhecidos. */
const KIND_LABEL: Record<string, string> = {
  document: "Documento",
  fee: "Taxa",
  documentation: "Documentação",
};

function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? "Pendência";
}

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Lista as pendências abertas pelo coordenador (documento OU taxa). É read-only:
 * a resolução acontece pelo lado do coordenador (o aluno acerta presencialmente/
 * pelo canal indicado). Quando não há pendências, o pai não renderiza esta lista.
 */
export function PendencyList({ pendencies }: PendencyListProps) {
  return (
    <div className="flex flex-col gap-3">
      {pendencies.map((p, i) => (
        <div key={p.external_id} className="card-in" style={{ animationDelay: `${i * 50}ms` }}>
          <Card pad="md" className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-brand-yellow/15 px-2.5 py-1 text-[12px] font-bold text-brand-ink">
                {kindLabel(p.kind)}
              </span>
              {typeof p.amount_cents === "number" && p.amount_cents > 0 ? (
                <span className="text-[15px] font-extrabold text-brand-ink">
                  {formatAmount(p.amount_cents)}
                </span>
              ) : null}
            </div>
            {p.description ? (
              <p className="text-[14px] leading-relaxed text-brand-muted">{p.description}</p>
            ) : null}
          </Card>
        </div>
      ))}
    </div>
  );
}
