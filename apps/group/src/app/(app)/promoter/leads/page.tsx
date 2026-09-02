"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiCollaborators, type PromoterLeadRow } from "@/lib/api-collaborators";
import { PageShell } from "@/components/ui/page-shell";
import { DataTableTanstack } from "@/components/ui/data-table-tanstack";
import { StatusPill } from "@/components/ui/status-pill";
import { Users, MessageSquare } from "lucide-react";

export default function PromoterLeadsPage() {
  const { data: leads } = useQuery({
    queryKey: ["promoter-my-leads"],
    queryFn: () => apiCollaborators.listMyLeads(),
  });

  const columns: ColumnDef<PromoterLeadRow>[] = [
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
      header: "WhatsApp",
      cell: ({ row }) => {
        const phone = row.original.phone;
        const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-brand-ink">{phone || "—"}</span>
            {cleanPhone && (
              <a
                href={`https://wa.me/55${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center p-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                title="Conversar no WhatsApp"
              >
                <MessageSquare className="size-3.5" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      accessorKey: "created_at",
      header: "Cadastro",
      cell: ({ row }) => (
        <span className="text-xs text-brand-muted">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
    },
  ];

  return (
    <PageShell
      title="Meus Leads"
      subtitle="Contatos cadastrados com seu link de indicação."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue-bg px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <Users className="size-3.5" />
          <span>{leads?.length || 0} Leads</span>
        </div>
      }
    >
      <div className="space-y-4 max-w-4xl mx-auto">
        <DataTableTanstack
          columns={columns}
          data={leads || []}
          searchPlaceholder="Buscar por nome ou WhatsApp..."
          emptyTitle="Nenhum lead encontrado"
          emptyDescription="Divulgue seu link para começar a captar alunos."
        />
      </div>
    </PageShell>
  );
}
