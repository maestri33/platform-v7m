"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiLeadership, type HubLeadRow } from "@/lib/api-leadership";
import { PageShell } from "@v7m/ui";
import { DataTableTanstack } from "@/components/common/data-table-tanstack";
import { StatusPill } from "@v7m/ui";
import { Target, Phone } from "lucide-react";

export default function HubLeadsPage() {
  const { data: leads, isLoading } = useQuery({
    queryKey: ["hub-leads"],
    queryFn: () => apiLeadership.listLeads(),
  });

  const columns: ColumnDef<HubLeadRow>[] = [
    {
      accessorKey: "name",
      header: "Lead",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-brand-ink">{row.original.name || "Lead Sem Nome"}</div>
          <div className="text-xs text-brand-muted font-mono">{row.original.external_id}</div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Contato",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-xs text-brand-ink">
          <Phone className="size-3 text-brand-blue" />
          <span>{row.original.phone || "—"}</span>
        </div>
      ),
    },
    {
      accessorKey: "promoter_name",
      header: "Promotor Responsável",
      cell: ({ row }) => (
        <span className="text-xs text-brand-ink font-medium">
          {row.original.promoter_name || "Captação Direta"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      accessorKey: "created_at",
      header: "Data de Entrada",
      cell: ({ row }) => (
        <span className="text-xs text-brand-muted">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
    },
  ];

  return (
    <PageShell
      title="Leads do Polo"
      description="Listagem e acompanhamento de todos os contatos captados pelos promotores do seu polo."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue-bg px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <Target className="h-3.5 w-3.5" />
          <span>{leads?.length || 0} Captados</span>
        </div>
      }
    >
      <div className="space-y-6">
        <DataTableTanstack
          columns={columns}
          data={leads || []}
          searchPlaceholder="Filtrar por nome, promotor ou telefone..."
          emptyTitle="Nenhum lead encontrado no polo"
          emptyDescription="Os leads gerados por links de afiliados e campanhas do polo aparecerão aqui."
        />
      </div>
    </PageShell>
  );
}
