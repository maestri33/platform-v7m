"use client";

import { GlobalList, field } from "@/components/ui/global-list";
import { StatusPill } from "@/components/ui/status-pill";
import { listEnrollments } from "@/lib/api";

export default function MatriculasPage() {
  return (
    <GlobalList
      title="Matrículas"
      subtitle="Matrículas de todos os polos."
      fetcher={listEnrollments}
      hubFilter
      emptyLabel="Nenhuma matrícula com esses filtros."
      columns={[
        { header: "Nome", cell: (r) => field(r, "name", "student_name", "customer_name") },
        { header: "CPF", cell: (r) => field(r, "cpf"), className: "hidden sm:table-cell" },
        { header: "Polo", cell: (r) => field(r, "hub_brand", "hub", "hub_external_id"), className: "max-w-[160px] truncate" },
        { header: "Status", cell: (r) => <StatusPill status={field(r, "status")} /> },
      ]}
    />
  );
}
