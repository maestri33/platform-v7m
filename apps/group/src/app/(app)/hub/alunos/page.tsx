"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiLeadership } from "@/lib/api-leadership";
import { PageShell } from "@v7m/ui";
import { DataTableTanstack } from "@/components/common/data-table-tanstack";
import { StatusPill } from "@v7m/ui";
import { GraduationCap } from "lucide-react";

export interface StudentRow {
  external_id: string;
  name?: string | null;
  student_name?: string | null;
  cpf?: string | null;
  status?: string;
  created_at?: string;
}

export default function HubAlunosPage() {
  const { data: response } = useQuery({
    queryKey: ["hub-students"],
    queryFn: () => apiLeadership.listStudents({ limit: 100 }),
  });

  const students: StudentRow[] = (response?.results || []) as unknown as StudentRow[];

  const columns: ColumnDef<StudentRow>[] = [
    {
      accessorKey: "name",
      header: "Aluno",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-brand-ink">{row.original.name || row.original.student_name || "Sem Nome"}</div>
          <div className="text-xs text-brand-muted font-mono">{row.original.external_id}</div>
        </div>
      ),
    },
    {
      accessorKey: "cpf",
      header: "CPF",
      cell: ({ row }) => (
        <span className="text-xs text-brand-ink font-mono">{row.original.cpf || "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Situação Acadêmica",
      cell: ({ row }) => <StatusPill status={row.original.status || "active"} />,
    },
    {
      accessorKey: "created_at",
      header: "Data de Início",
      cell: ({ row }) => (
        <span className="text-xs text-brand-muted">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
    },
  ];

  return (
    <PageShell
      title="Alunos do Polo"
      description="Acompanhamento acadêmico dos estudantes matriculados e vinculados ao polo regional."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue-bg px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <GraduationCap className="h-3.5 w-3.5" />
          <span>{response?.total || students.length} Alunos</span>
        </div>
      }
    >
      <div className="space-y-6">
        <DataTableTanstack
          columns={columns}
          data={students}
          searchPlaceholder="Filtrar alunos por nome ou CPF..."
          emptyTitle="Nenhum aluno cadastrado no polo"
          emptyDescription="Conforme as matrículas forem concluídas, os alunos ativos aparecerão aqui."
        />
      </div>
    </PageShell>
  );
}
