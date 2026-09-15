"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiLeadership, type HubPromoterRow } from "@/lib/api-leadership";
import { PageShell } from "@v7m/ui";
import { DataTableTanstack } from "@/components/common/data-table-tanstack";
import { StatusPill } from "@v7m/ui";
import { Button } from "@v7m/ui";
import { ConfirmDialog } from "@v7m/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@v7m/ui";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import {
  Award,
  Lock,
  Unlock,
  UserX,
  UserCheck,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";

export default function HubEquipePage() {
  const queryClient = useQueryClient();

  const [confirmAction, setConfirmAction] = React.useState<{
    type: "suspend" | "reactivate" | "unlock" | "candidate_approve" | "candidate_reject";
    id: string;
    name?: string | null;
    materialId?: string;
  } | null>(null);

  const { data: promoters } = useQuery({
    queryKey: ["hub-promoters"],
    queryFn: () => apiLeadership.listPromoters(),
  });

  const { data: candidates } = useQuery({
    queryKey: ["hub-candidates"],
    queryFn: () => apiLeadership.listCandidatesAwaiting(),
  });

  const suspendMutation = useMutation({
    mutationFn: async (id: string) => apiLeadership.suspendPromoter(id),
    onSuccess: () => {
      toast.success("Promotor suspenso com sucesso.");
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ["hub-promoters"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => apiLeadership.reactivatePromoter(id),
    onSuccess: () => {
      toast.success("Promotor reativado com sucesso.");
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ["hub-promoters"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async ({
      promoterId,
      materialId,
    }: {
      promoterId: string;
      materialId: string;
    }) => {
      return apiLeadership.approvePromoterTrainingMaterial(promoterId, materialId);
    },
    onSuccess: () => {
      toast.success("Treinamento destravado com sucesso.");
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ["hub-promoters"] });
      queryClient.invalidateQueries({ queryKey: ["hub-reviews"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const approveCandidateMutation = useMutation({
    mutationFn: async (id: string) => apiLeadership.approveCandidate(id),
    onSuccess: () => {
      toast.success("Candidato aprovado com sucesso.");
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ["hub-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["hub-promoters"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const rejectCandidateMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      apiLeadership.rejectCandidate(id, reason),
    onSuccess: () => {
      toast.success("Candidato rejeitado.");
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ["hub-candidates"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const handleConfirmAction = (reason?: string) => {
    if (!confirmAction) return;
    const { type, id } = confirmAction;

    if (type === "suspend") {
      suspendMutation.mutate(id);
    } else if (type === "reactivate") {
      reactivateMutation.mutate(id);
    } else if (type === "unlock") {
      unlockMutation.mutate({
        promoterId: id,
        materialId: confirmAction.materialId || "current",
      });
    } else if (type === "candidate_approve") {
      approveCandidateMutation.mutate(id);
    } else if (type === "candidate_reject") {
      rejectCandidateMutation.mutate({ id, reason: reason || "Rejeitado" });
    }
  };

  const promoterColumns: ColumnDef<HubPromoterRow>[] = [
    {
      accessorKey: "name",
      header: "Promotor",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-brand-ink">{row.original.name || "Sem identificação"}</div>
          <div className="text-xs text-brand-muted font-mono">{row.original.external_id}</div>
        </div>
      ),
    },
    {
      accessorKey: "locked",
      header: "Status no Treino",
      cell: ({ row }) => {
        const isLocked = row.original.locked;
        return isLocked ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-danger-bg text-brand-danger">
            <Lock className="h-3 w-3" /> Treino Travado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-green-bg text-brand-green-dark">
            <Unlock className="h-3 w-3" /> Liberado
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Situação",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => {
        const isSuspended = row.original.status === "suspended";
        const isLocked = row.original.locked;

        return (
          <div className="flex items-center gap-2">
            {isLocked && (
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs gap-1 bg-brand-green hover:bg-brand-green-dark"
                onClick={() =>
                  setConfirmAction({
                    type: "unlock",
                    id: row.original.external_id,
                    name: row.original.name,
                    materialId: "current",
                  })
                }
              >
                <Unlock className="h-3.5 w-3.5" /> Destravar Treino
              </Button>
            )}

            {isSuspended ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 text-brand-green-dark border-brand-green/30 hover:bg-brand-green-bg"
                onClick={() =>
                  setConfirmAction({
                    type: "reactivate",
                    id: row.original.external_id,
                    name: row.original.name,
                  })
                }
              >
                <UserCheck className="h-3.5 w-3.5" /> Reativar
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() =>
                  setConfirmAction({
                    type: "suspend",
                    id: row.original.external_id,
                    name: row.original.name,
                  })
                }
              >
                <UserX className="h-3.5 w-3.5" /> Suspender
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <PageShell
      title="Equipe do Polo"
      description="Gestão de promotores vinculados, destravamento de capacitação e homologações."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue-bg px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <Award className="h-3.5 w-3.5" />
          <span>{promoters?.length || 0} Promotores</span>
        </div>
      }
    >
      <div className="space-y-8">
        {candidates && candidates.length > 0 && (
          <Card className="border-brand-amber/40 shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-brand-amber" />
                Candidatos Aguardando Homologação ({candidates.length})
              </CardTitle>
              <CardDescription>
                Novos promotores cadastrados no seu polo que aguardam aprovação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div id="candidates-list" className="space-y-2">
                {candidates.map((cand) => (
                  <div
                    key={cand.external_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-brand-border bg-brand-bg/40 gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-sm text-brand-ink">
                        {cand.name || "Candidato Sem Nome"}
                      </div>
                      <div className="text-xs text-brand-muted">
                        Cadastrado em {cand.since ? new Date(cand.since).toLocaleDateString("pt-BR") : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 text-xs gap-1 bg-brand-green hover:bg-brand-green-dark"
                        onClick={() => approveCandidateMutation.mutate(cand.external_id)}
                        disabled={approveCandidateMutation.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => {
                          const reason = window.prompt("Motivo da rejeição:");
                          if (reason) rejectCandidateMutation.mutate({ id: cand.external_id, reason });
                        }}
                        disabled={rejectCandidateMutation.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h3 className="text-base font-bold text-brand-ink flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-blue" />
            Promotores Vinculados ao Polo
          </h3>
          <div id="promoters-list">
            <DataTableTanstack
              columns={promoterColumns}
              data={promoters || []}
              searchPlaceholder="Filtrar por nome ou ID..."
              emptyTitle="Nenhum promotor cadastrado"
              emptyDescription="Os promotores aprovados e ativos aparecerão nesta listagem."
            />
          </div>
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          open={Boolean(confirmAction)}
          onOpenChange={() => setConfirmAction(null)}
          title={
            confirmAction.type === "suspend"
              ? "Suspender Promotor"
              : confirmAction.type === "reactivate"
              ? "Reativar Promotor"
              : confirmAction.type === "unlock"
              ? "Destravar Treino do Promotor"
              : confirmAction.type === "candidate_approve"
              ? "Aprovar Candidato"
              : "Rejeitar Candidato"
          }
          description={
            confirmAction.type === "suspend"
              ? `Tem certeza que deseja suspender o acesso de "${confirmAction.name || "este promotor"}"?`
              : confirmAction.type === "reactivate"
              ? `Confirma a reativação do promotor "${confirmAction.name || "este promotor"}"?`
              : confirmAction.type === "unlock"
              ? `Deseja liberar a matéria pendente e destravar a trilha de "${confirmAction.name || "este promotor"}"?`
              : confirmAction.type === "candidate_approve"
              ? `Deseja aprovar "${confirmAction.name || "o candidato"}" como promotor oficial?`
              : `Informe o motivo da rejeição do candidato.`
          }
          confirmText="Confirmar"
          variant={
            confirmAction.type === "suspend" || confirmAction.type === "candidate_reject"
              ? "destructive"
              : "default"
          }
          requireReason={confirmAction.type === "candidate_reject"}
          loading={
            suspendMutation.isPending ||
            reactivateMutation.isPending ||
            unlockMutation.isPending ||
            approveCandidateMutation.isPending ||
            rejectCandidateMutation.isPending
          }
          onConfirm={handleConfirmAction}
        />
      )}
    </PageShell>
  );
}
