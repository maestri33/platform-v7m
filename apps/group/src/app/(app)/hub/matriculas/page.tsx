"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiLeadership, type HubEnrollmentRow } from "@/lib/api-leadership";
import { PageShell, StatusPill, Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@v7m/ui";
import { DataTableTanstack } from "@/components/common/data-table-tanstack";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { GraduationCap, Eye, KeyRound } from "lucide-react";

export default function HubMatriculasPage() {
  const queryClient = useQueryClient();
  const [selectedEnrollment, setSelectedEnrollment] = React.useState<HubEnrollmentRow | null>(null);
  const [concludeModalOpen, setConcludeModalOpen] = React.useState(false);
  const [concludeData, setConcludeData] = React.useState({ platform_login: "", platform_password: "", platform_url: "", platform_notes: "" });

  const { data: enrollments } = useQuery({ queryKey: ["hub-enrollments"], queryFn: () => apiLeadership.listEnrollments() });

  const concludeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEnrollment) throw new Error("Nenhuma matrícula selecionada.");
      return apiLeadership.concludeEnrollment(selectedEnrollment.external_id, concludeData);
    },
    onSuccess: () => {
      toast.success("Matrícula concluída e credenciais registradas!");
      setConcludeModalOpen(false);
      setSelectedEnrollment(null);
      queryClient.invalidateQueries({ queryKey: ["hub-enrollments"] });
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });

  const columns: ColumnDef<HubEnrollmentRow>[] = [
    { accessorKey: "student_name", header: "Aluno", cell: ({ row }) => <div className="space-y-0.5"><div className="font-semibold text-brand-ink">{row.original.student_name || "Sem identificação"}</div><div className="text-xs text-brand-muted font-mono">{row.original.external_id}</div></div> },
    { accessorKey: "promoter_name", header: "Promotor", cell: ({ row }) => <span className="text-xs text-brand-ink font-medium">{row.original.promoter_name || "Venda Direta"}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusPill status={row.original.status} /> },
    { accessorKey: "created_at", header: "Data", cell: ({ row }) => <span className="text-xs text-brand-muted">{row.original.created_at ? new Date(row.original.created_at).toLocaleDateString("pt-BR") : "—"}</span> },
    { id: "actions", header: "Ações", cell: ({ row }) => <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setSelectedEnrollment(row.original)}><Eye className="h-3.5 w-3.5" /> Detalhes</Button> },
  ];

  return (
    <PageShell title="Matrículas do Polo" description="Acompanhamento e conclusão de matrículas vinculadas exclusivamente ao seu polo regional." badge={<div className="flex items-center gap-1.5 rounded-full bg-brand-green-bg px-3 py-1 text-xs font-semibold text-brand-green-dark border border-brand-green/20"><GraduationCap className="h-3.5 w-3.5" /><span>{enrollments?.length || 0} Registradas</span></div>}>
      <div className="space-y-6"><DataTableTanstack columns={columns} data={enrollments || []} searchPlaceholder="Filtrar por aluno, promotor ou ID..." emptyTitle="Nenhuma matrícula encontrada" emptyDescription="As matrículas confirmadas pelo polo aparecerão listadas aqui." /></div>

      {selectedEnrollment && <Dialog open={Boolean(selectedEnrollment)} onOpenChange={() => setSelectedEnrollment(null)}><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-brand-blue" />Matrícula: {selectedEnrollment.student_name || "Detalhes"}</DialogTitle><DialogDescription>Identificador: {selectedEnrollment.external_id}</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="grid grid-cols-2 gap-4 text-xs bg-brand-bg/50 p-4 rounded-xl border border-brand-border"><div><span className="text-brand-muted block">Status da Matrícula:</span><StatusPill status={selectedEnrollment.status} /></div><div><span className="text-brand-muted block">Promotor Vinculado:</span><strong className="text-brand-ink">{selectedEnrollment.promoter_name || "Venda Direta"}</strong></div><div><span className="text-brand-muted block">Necessita Revisão:</span><strong>{selectedEnrollment.needs_review ? "⚠️ Sim" : "✅ Não"}</strong></div><div><span className="text-brand-muted block">Divergência Cadastral:</span><strong>{selectedEnrollment.has_divergence ? "⚠️ Detectada" : "✅ Nenhuma"}</strong></div></div><div className="flex flex-wrap gap-2 pt-2 border-t border-brand-border"><Button variant="default" size="sm" onClick={() => setConcludeModalOpen(true)} className="gap-1.5 bg-brand-green hover:bg-brand-green-dark"><KeyRound className="h-4 w-4" /> Concluir & Inserir Credenciais</Button></div></div></DialogContent></Dialog>}

      {concludeModalOpen && <Dialog open={concludeModalOpen} onOpenChange={setConcludeModalOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-brand-green" />Conclusão de Matrícula</DialogTitle><DialogDescription>Informe o login e senha gerados no sistema acadêmico.</DialogDescription></DialogHeader><div className="space-y-3 py-2"><div className="space-y-1"><label className="text-xs font-semibold text-brand-ink">Login da Plataforma <span className="text-brand-danger">*</span></label><Input placeholder="Ex: aluno.silva" value={concludeData.platform_login} onChange={(e) => setConcludeData({ ...concludeData, platform_login: e.target.value })} /></div><div className="space-y-1"><label className="text-xs font-semibold text-brand-ink">Senha Provisória <span className="text-brand-danger">*</span></label><Input type="text" placeholder="Ex: Senha@123" value={concludeData.platform_password} onChange={(e) => setConcludeData({ ...concludeData, platform_password: e.target.value })} /></div><div className="space-y-1"><label className="text-xs font-semibold text-brand-ink">URL da Plataforma (Opcional)</label><Input placeholder="https://..." value={concludeData.platform_url} onChange={(e) => setConcludeData({ ...concludeData, platform_url: e.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setConcludeModalOpen(false)}>Cancelar</Button><Button variant="default" className="bg-brand-green hover:bg-brand-green-dark" onClick={() => concludeMutation.mutate()} disabled={!concludeData.platform_login || !concludeData.platform_password || concludeMutation.isPending}>{concludeMutation.isPending ? "Concluindo..." : "Concluir Matrícula"}</Button></DialogFooter></DialogContent></Dialog>}
    </PageShell>
  );
}
