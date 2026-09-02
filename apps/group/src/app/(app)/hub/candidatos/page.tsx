"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiLeadership, type CandidateAwaitingRow } from "@/lib/api-leadership";
import { PageShell } from "@/components/ui/page-shell";
import { DataTableTanstack } from "@/components/ui/data-table-tanstack";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ComparisonViewer } from "@/components/common/comparison-viewer";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import {
  UserCheck,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";

export default function HubCandidatosPage() {
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] = React.useState<CandidateAwaitingRow | null>(null);

  const [confirmAction, setConfirmAction] = React.useState<{
    type: "approve" | "reject" | "reset_doc";
    candidate: CandidateAwaitingRow;
  } | null>(null);

  // Fetch fila de candidatos aguardando aprovação
  const { data: candidates } = useQuery({
    queryKey: ["hub-candidates"],
    queryFn: () => apiLeadership.listCandidatesAwaiting(),
  });

  // Query do detalhe rico
  const { data: candidateDetail } = useQuery({
    queryKey: ["hub-candidate-detail", selectedCandidate?.external_id],
    queryFn: () => apiLeadership.getCandidateDetail(selectedCandidate!.external_id),
    enabled: Boolean(selectedCandidate),
  });

  // Mutação: Aprovar / Rejeitar
  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      approve,
      reason,
    }: {
      id: string;
      approve: boolean;
      reason?: string;
    }) => {
      if (approve) {
        return apiLeadership.approveCandidate(id);
      }
      return apiLeadership.rejectCandidate(id, reason || "Rejeitado pelo coordenador.");
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.approve
          ? "Candidato aprovado com sucesso! Promovido a Promotor do polo."
          : "Candidato rejeitado com justificativa."
      );
      setConfirmAction(null);
      setSelectedCandidate(null);
      queryClient.invalidateQueries({ queryKey: ["hub-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["hub-promoters"] });
      queryClient.invalidateQueries({ queryKey: ["hub-reviews"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  // Mutação: Reset Doc Type
  const resetDocTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiLeadership.resetCandidateDocType(id);
    },
    onSuccess: () => {
      toast.success("Tipo de documento resetado com sucesso.");
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ["hub-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["hub-candidate-detail"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const handleConfirmAction = (reason?: string) => {
    if (!confirmAction) return;
    if (confirmAction.type === "approve") {
      actionMutation.mutate({ id: confirmAction.candidate.external_id, approve: true });
    } else if (confirmAction.type === "reject") {
      actionMutation.mutate({ id: confirmAction.candidate.external_id, approve: false, reason });
    } else if (confirmAction.type === "reset_doc") {
      resetDocTypeMutation.mutate(confirmAction.candidate.external_id);
    }
  };

  const columns: ColumnDef<CandidateAwaitingRow>[] = [
    {
      accessorKey: "name",
      header: "Candidato",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-brand-ink">{row.original.name || "Candidato Sem Nome"}</div>
          <div className="text-xs text-brand-muted font-mono">{row.original.external_id}</div>
        </div>
      ),
    },
    {
      accessorKey: "since",
      header: "Aguardando Desde",
      cell: ({ row }) => (
        <span className="text-xs text-brand-muted">
          {row.original.since ? new Date(row.original.since).toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
    },
    {
      accessorKey: "rejected",
      header: "Situação",
      cell: ({ row }) => (
        <StatusPill status={row.original.rejected ? "rejected" : "awaiting_approval"} />
      ),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setSelectedCandidate(row.original)}
          >
            <Eye className="h-3.5 w-3.5" /> Detalhes
          </Button>

          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs gap-1 bg-brand-green hover:bg-brand-green-dark"
            onClick={() => setConfirmAction({ type: "approve", candidate: row.original })}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
          </Button>

          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setConfirmAction({ type: "reject", candidate: row.original })}
          >
            <XCircle className="h-3.5 w-3.5" /> Rejeitar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Candidatos a Promotor"
      description="Homologação final de candidatos do polo para se tornarem promotores de vendas."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-amber-bg px-3 py-1 text-xs font-semibold text-brand-amber border border-brand-amber/30">
          <UserCheck className="h-3.5 w-3.5" />
          <span>{candidates?.length || 0} Aguardando Aprovação</span>
        </div>
      }
    >
      <div id="candidates-list" className="space-y-6">
        <DataTableTanstack
          columns={columns}
          data={candidates || []}
          searchPlaceholder="Filtrar por nome ou ID..."
          emptyTitle="Nenhum candidato aguardando homologação"
          emptyDescription="Quando novos candidatos concluírem o cadastro no polo, eles aparecerão aqui."
        />
      </div>

      {/* MODAL DETALHE COMPLETO DO CANDIDATO */}
      {selectedCandidate && (
        <Dialog open={Boolean(selectedCandidate)} onOpenChange={() => setSelectedCandidate(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-brand-blue" />
                Candidato: {selectedCandidate.name || "Detalhes"}
              </DialogTitle>
              <DialogDescription>
                ID: {selectedCandidate.external_id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <ComparisonViewer
                selfieUrl={candidateDetail?.selfie_image}
                documentUrl={candidateDetail?.document?.front_photo || candidateDetail?.document?.full_photo}
                backDocumentUrl={candidateDetail?.document?.back_photo}
                selfieLabel={`Selfie (${candidateDetail?.selfie_status || "—"})`}
                documentLabel={`Documento ${candidateDetail?.doc_type || "RG/CNH"}`}
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-brand-bg/50 p-4 rounded-xl border border-brand-border">
                <div>
                  <span className="text-brand-muted block">Nome:</span>
                  <strong className="text-brand-ink">{candidateDetail?.user?.name || selectedCandidate.name || "—"}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">CPF:</span>
                  <strong className="text-brand-ink">{candidateDetail?.user?.cpf || "—"}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">Telefone:</span>
                  <strong className="text-brand-ink">{candidateDetail?.user?.phone || "—"}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">Chave PIX:</span>
                  <strong className="text-brand-ink">{candidateDetail?.pix_key || "—"}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">PIX Validado:</span>
                  <strong>{candidateDetail?.pix_validated ? "✅ Sim" : "⏳ Não"}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">Status Atual:</span>
                  <StatusPill status={candidateDetail?.status || "awaiting_approval"} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-brand-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmAction({ type: "reset_doc", candidate: selectedCandidate })}
                  className="text-xs text-brand-muted hover:text-brand-ink"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Destravar Tipo de Doc
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmAction({ type: "reject", candidate: selectedCandidate })}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    className="bg-brand-green hover:bg-brand-green-dark"
                    onClick={() => setConfirmAction({ type: "approve", candidate: selectedCandidate })}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar como Promotor
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* CONFIRM DIALOG */}
      {confirmAction && (
        <ConfirmDialog
          open={Boolean(confirmAction)}
          onOpenChange={() => setConfirmAction(null)}
          title={
            confirmAction.type === "approve"
              ? "Aprovar Candidato como Promotor"
              : confirmAction.type === "reject"
              ? "Rejeitar Candidato"
              : "Resetar Tipo de Documento"
          }
          description={
            confirmAction.type === "approve"
              ? `Tem certeza que deseja aprovar "${confirmAction.candidate.name || "o candidato"}"? Ele será habilitado como promotor oficial do polo.`
              : confirmAction.type === "reject"
              ? `Informe o motivo da rejeição do candidato.`
              : `Deseja permitir que o candidato selecione outro tipo de documento?`
          }
          confirmText={
            confirmAction.type === "approve"
              ? "Aprovar"
              : confirmAction.type === "reject"
              ? "Rejeitar"
              : "Confirmar"
          }
          variant={confirmAction.type === "reject" ? "destructive" : "default"}
          requireReason={confirmAction.type === "reject"}
          reasonPlaceholder="Informe o motivo da rejeição..."
          loading={actionMutation.isPending || resetDocTypeMutation.isPending}
          onConfirm={handleConfirmAction}
        />
      )}
    </PageShell>
  );
}
