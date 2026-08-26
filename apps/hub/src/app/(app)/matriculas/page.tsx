"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { type ColumnDef } from "@tanstack/react-table";
import { apiLeadership } from "@/lib/api-leadership";
import { PageShell } from "@/components/layout/page-shell";
import { DataTableTanstack } from "@/components/ui/data-table-tanstack";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatDateBR } from "@/lib/date";
import { formatPhoneBR } from "@/lib/phone";
import { toast } from "sonner";
import type { HubEnrollmentRow } from "@/lib/types";
import {
  GraduationCap,
  Eye,
  KeyRound,
  UserCog,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  DollarSign,
} from "lucide-react";

export default function MatriculasPage() {
  return (
    <React.Suspense fallback={<div>Carregando...</div>}>
      <MatriculasContent />
    </React.Suspense>
  );
}

function MatriculasContent() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useQueryState("status", { defaultValue: "" });

  const [selectedEnrollment, setSelectedEnrollment] = React.useState<HubEnrollmentRow | null>(null);
  const [concludeModalOpen, setConcludeModalOpen] = React.useState(false);
  const [identityModalOpen, setIdentityModalOpen] = React.useState(false);

  // Forms
  const [concludeData, setConcludeData] = React.useState({
    platform_login: "",
    platform_password: "",
    platform_url: "",
    platform_notes: "",
  });

  const [identityData, setIdentityData] = React.useState({
    mother_name: "",
    father_name: "",
    marital_status: "",
    birthplace: "",
    nationality: "",
  });

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["enrollments", statusFilter],
    queryFn: () => apiLeadership.listEnrollments(statusFilter || undefined),
  });

  // Query do detalhe rico
  const { data: enrollmentDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["enrollment-detail", selectedEnrollment?.external_id],
    queryFn: () => apiLeadership.getEnrollment(selectedEnrollment!.external_id),
    enabled: Boolean(selectedEnrollment),
  });

  // Concluir Matrícula
  const concludeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEnrollment) return;
      return apiLeadership.concludeEnrollment(selectedEnrollment.external_id, concludeData);
    },
    onSuccess: () => {
      toast.success("Matrícula concluída e credenciais registradas!");
      setConcludeModalOpen(false);
      setSelectedEnrollment(null);
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
    onError: (err: any) => {
      toast.error(err.detail || err.message || "Falha ao concluir matrícula.");
    },
  });

  // Corrigir Identidade
  const identityMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEnrollment) return;
      return apiLeadership.correctEnrollmentIdentity(selectedEnrollment.external_id, identityData);
    },
    onSuccess: () => {
      toast.success("Dados de identidade atualizados com sucesso!");
      setIdentityModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment-detail"] });
    },
    onError: (err: any) => {
      toast.error(err.detail || err.message || "Falha ao atualizar dados.");
    },
  });

  const columns: ColumnDef<HubEnrollmentRow>[] = [
    {
      accessorKey: "name",
      header: "Aluno",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-brand-ink">{row.original.name || "Sem identificação"}</div>
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
      accessorKey: "fees",
      header: "Taxas do Polo",
      cell: ({ row }) => {
        const fees = row.original.fees;
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${
                fees.first_paid
                  ? "bg-brand-green-bg text-brand-green-dark"
                  : "bg-brand-amber-bg text-brand-amber"
              }`}
            >
              <DollarSign className="h-3 w-3" />
              1ª: {fees.first_paid ? "Paga" : "Pendente"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${
                fees.second_scheduled
                  ? "bg-brand-blue-bg text-brand-blue"
                  : "bg-brand-muted/10 text-brand-muted"
              }`}
            >
              2ª: {fees.second_scheduled ? "Agendada" : "Pendente"}
            </span>
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
      header: "Data",
      cell: ({ row }) => (
        <span className="text-xs text-brand-muted">{formatDateBR(row.original.created_at)}</span>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setSelectedEnrollment(row.original)}
        >
          <Eye className="h-3.5 w-3.5" /> Detalhes
        </Button>
      ),
    },
  ];

  return (
    <PageShell
      title="Matrículas do Polo"
      description="Acompanhamento e conclusão de matrículas vinculadas exclusivamente ao seu polo."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-green-bg px-3 py-1 text-xs font-semibold text-brand-green-dark border border-brand-green/20">
          <GraduationCap className="h-3.5 w-3.5" />
          <span>{enrollments?.length || 0} Registradas</span>
        </div>
      }
    >
      <div className="space-y-6">
        <DataTableTanstack
          columns={columns}
          data={enrollments || []}
          searchPlaceholder="Filtrar por nome ou ID..."
          emptyTitle="Nenhuma matrícula encontrada"
          emptyDescription="As matrículas confirmadas pelo polo aparecerão listadas aqui."
        />
      </div>

      {/* MODAL DETALHE DA MATRÍCULA */}
      {selectedEnrollment && (
        <Dialog open={Boolean(selectedEnrollment)} onOpenChange={() => setSelectedEnrollment(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-brand-blue" />
                Matrícula: {selectedEnrollment.name || "Detalhes"}
              </DialogTitle>
              <DialogDescription>
                Identificador: {selectedEnrollment.external_id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-xs bg-brand-bg/50 p-4 rounded-xl border border-brand-border">
                <div>
                  <span className="text-brand-muted block">Status da Matrícula:</span>
                  <StatusPill status={selectedEnrollment.status} />
                </div>
                <div>
                  <span className="text-brand-muted block">Telefone:</span>
                  <strong className="text-brand-ink">{formatPhoneBR(selectedEnrollment.phone)}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">1ª Parcela:</span>
                  <strong>{selectedEnrollment.fees?.first_paid ? "✅ Paga" : "⏳ Pendente"}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">2ª Parcela:</span>
                  <strong>{selectedEnrollment.fees?.second_scheduled ? "📅 Agendada" : "⏳ Pendente"}</strong>
                </div>
              </div>

              {/* Ações de Gestão */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-border">
                <Button
                  variant="action"
                  size="sm"
                  onClick={() => setConcludeModalOpen(true)}
                  className="gap-1.5"
                >
                  <KeyRound className="h-4 w-4" /> Concluir & Inserir Credenciais
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIdentityData({
                      mother_name: enrollmentDetail?.profile?.mother_name || "",
                      father_name: enrollmentDetail?.profile?.father_name || "",
                      marital_status: enrollmentDetail?.profile?.marital_status || "",
                      birthplace: enrollmentDetail?.profile?.birthplace || "",
                      nationality: enrollmentDetail?.profile?.nationality || "",
                    });
                    setIdentityModalOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <UserCog className="h-4 w-4" /> Corrigir Identidade Manualmente
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL CONCLUIR MATRÍCULA */}
      {concludeModalOpen && (
        <Dialog open={concludeModalOpen} onOpenChange={setConcludeModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-brand-green" />
                Conclusão de Matrícula
              </DialogTitle>
              <DialogDescription>
                Informe o login e senha gerados no sistema acadêmico parceiro.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-ink">
                  Login da Plataforma <span className="text-brand-danger">*</span>
                </label>
                <Input
                  placeholder="Ex: aluno.silva"
                  value={concludeData.platform_login}
                  onChange={(e) => setConcludeData({ ...concludeData, platform_login: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-ink">
                  Senha Provisória <span className="text-brand-danger">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Senha@123"
                  value={concludeData.platform_password}
                  onChange={(e) => setConcludeData({ ...concludeData, platform_password: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-ink">URL da Plataforma (Opcional)</label>
                <Input
                  placeholder="https://..."
                  value={concludeData.platform_url}
                  onChange={(e) => setConcludeData({ ...concludeData, platform_url: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConcludeModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="action"
                onClick={() => concludeMutation.mutate()}
                disabled={!concludeData.platform_login || !concludeData.platform_password || concludeMutation.isPending}
              >
                {concludeMutation.isPending ? "Concluindo..." : "Concluir Matrícula"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL CORRIGIR IDENTIDADE */}
      {identityModalOpen && (
        <Dialog open={identityModalOpen} onOpenChange={setIdentityModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-brand-blue" />
                Correção de Identidade
              </DialogTitle>
              <DialogDescription>
                Ajuste os dados cadastrais do aluno com base no documento conferido.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-ink">Nome da Mãe</label>
                <Input
                  value={identityData.mother_name}
                  onChange={(e) => setIdentityData({ ...identityData, mother_name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-ink">Nome do Pai</label>
                <Input
                  value={identityData.father_name}
                  onChange={(e) => setIdentityData({ ...identityData, father_name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-ink">Naturalidade / Cidade de Nascimento</label>
                <Input
                  value={identityData.birthplace}
                  onChange={(e) => setIdentityData({ ...identityData, birthplace: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIdentityModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={() => identityMutation.mutate()}
                disabled={identityMutation.isPending}
              >
                {identityMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageShell>
  );
}
