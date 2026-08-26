"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { type ColumnDef } from "@tanstack/react-table";
import { apiLeadership } from "@/lib/api-leadership";
import { PageShell } from "@/components/layout/page-shell";
import { DataTableTanstack } from "@/components/ui/data-table-tanstack";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { formatPhoneBR } from "@/lib/phone";
import { ExternalLink, Target, DollarSign } from "lucide-react";
import type { HubLeadRow } from "@/lib/types";

export default function LeadsPage() {
  return (
    <React.Suspense fallback={<div>Carregando...</div>}>
      <LeadsContent />
    </React.Suspense>
  );
}

function LeadsContent() {
  const [statusFilter] = useQueryState("status", { defaultValue: "" });

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", statusFilter],
    queryFn: () => apiLeadership.listLeads(statusFilter || undefined),
  });

  const columns: ColumnDef<HubLeadRow>[] = [
    {
      accessorKey: "name",
      header: "Lead / Prospecto",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-brand-ink">{row.original.name || "Lead Sem Nome"}</div>
          <div className="text-xs text-brand-muted font-mono">{row.original.external_id}</div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "WhatsApp",
      cell: ({ row }) => (
        <span className="text-xs text-brand-muted">{formatPhoneBR(row.original.phone)}</span>
      ),
    },
    {
      accessorKey: "promoter_external_id",
      header: "Promotor Vinculado",
      cell: ({ row }) => (
        <span className="text-xs font-mono text-brand-muted">
          {row.original.promoter_external_id}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status do Funil",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      id: "payment",
      header: "Link de Pagamento",
      cell: ({ row }) => {
        const link = row.original.payment_link;
        if (!link) return <span className="text-xs text-brand-muted">—</span>;
        return (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline font-medium"
          >
            <DollarSign className="h-3.5 w-3.5" /> Abrir Link <ExternalLink className="h-3 w-3" />
          </a>
        );
      },
    },
  ];

  return (
    <PageShell
      title="Leads do Polo"
      description="Acompanhamento dos leads cadastrados pelos promotores e status de conversão."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue-bg px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <Target className="h-3.5 w-3.5" />
          <span>{leads?.length || 0} Leads</span>
        </div>
      }
    >
      <div className="space-y-6">
        <DataTableTanstack
          columns={columns}
          data={leads || []}
          searchPlaceholder="Filtrar por nome ou ID..."
          emptyTitle="Nenhum lead encontrado"
          emptyDescription="Os leads cadastrados pelos promotores do polo aparecerão aqui."
        />
      </div>
    </PageShell>
  );
}
