"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiLeadership } from "@/lib/api-leadership";
import { PageShell } from "@/components/ui/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { RiskBadge } from "@/components/common/risk-badge";
import { DivergenceBadge } from "@/components/common/divergence-badge";
import { CaseSummaryCard } from "@/components/common/case-summary-card";
import { ComparisonViewer } from "@/components/common/comparison-viewer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { evaluateReviewRisk, sortReviewsByRisk, type ReviewItem } from "@/lib/risk-analysis";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import {
  Inbox,
  Sparkles,
  Search,
  FileText,
  User,
  Award,
  RotateCcw,
  Eye,
  Check,
  X,
  Lock,
  Unlock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function HubInboxPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [sortByRisk, setSortByRisk] = React.useState(true);

  const [selectedItem, setSelectedItem] = React.useState<ReviewItem | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<{
    type: "approve" | "reject" | "reset_doc" | "unlock_material";
    item: ReviewItem;
    materialId?: string;
  } | null>(null);

  const { data: reviews, isLoading, refetch } = useQuery({
    queryKey: ["hub-reviews"],
    queryFn: () => apiLeadership.listReviews(),
  });

  const { data: itemDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["hub-review-detail", selectedItem?.type, selectedItem?.external_id],
    queryFn: async () => {
      if (!selectedItem) return null;
      if (selectedItem.type === "candidate") {
        return apiLeadership.getCandidateDetail(selectedItem.external_id);
      }
      if (selectedItem.type === "enrollment") {
        return apiLeadership.getEnrollment(selectedItem.external_id);
      }
      return null;
    },
    enabled: Boolean(selectedItem),
  });

  const decideMutation = useMutation({
    mutationFn: async ({
      item,
      approve,
      reason,
    }: {
      item: ReviewItem;
      approve: boolean;
      reason?: string;
    }) => {
      const id = item.external_id;
      if (item.type === "candidate") {
        if (approve) return apiLeadership.approveCandidate(id);
        return apiLeadership.rejectCandidate(id, reason || "Rejeitado pelo coordenador.");
      }
      return null;
    },
    onSuccess: () => {
      toast.success("Operação concluída com sucesso.");
      setConfirmAction(null);
      setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ["hub-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["hub-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["hub-enrollments"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const unlockTrainingMutation = useMutation({
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
      toast.success("Matéria de treino aprovada e promotor destravado!");
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ["hub-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["hub-promoters"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const resetDocTypeMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      return apiLeadership.resetCandidateDocType(candidateId);
    },
    onSuccess: () => {
      toast.success("Tipo de documento resetado com sucesso.");
      setConfirmAction(null);
      setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ["hub-reviews"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const {
    allList,
    selfiesList,
    docsList,
    lockedPromotersList,
    candidatesAwaitingList,
  } = React.useMemo(() => {
    if (!reviews) {
      return {
        allList: [],
        selfiesList: [],
        docsList: [],
        lockedPromotersList: [],
        candidatesAwaitingList: [],
      };
    }

    const selfies = [
      ...(reviews.enrollment_selfie || []),
      ...(reviews.candidate_selfie || []),
    ];

    const docs = [
      ...(reviews.enrollment_rg || []),
      ...(reviews.candidate_document || []),
      ...(reviews.student_documents || []),
    ];

    const locked = reviews.locked_promoters || [];
    const candidates = reviews.candidates_awaiting_approval || [];

    const rawAll = [...selfies, ...docs, ...locked, ...candidates];

    const filterFn = (item: ReviewItem) => {
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        item.name?.toLowerCase().includes(term) ||
        item.external_id.toLowerCase().includes(term) ||
        item.doc_type?.toLowerCase().includes(term) ||
        item.kind?.toLowerCase().includes(term)
      );
    };

    const applySorting = (list: ReviewItem[]) => {
      const filtered = list.filter(filterFn);
      return sortByRisk ? sortReviewsByRisk(filtered) : filtered;
    };

    return {
      allList: applySorting(rawAll),
      selfiesList: applySorting(selfies),
      docsList: applySorting(docs),
      lockedPromotersList: applySorting(locked),
      candidatesAwaitingList: applySorting(candidates),
    };
  }, [reviews, search, sortByRisk]);

  const listsByTab: Record<string, ReviewItem[]> = {
    all: allList,
    selfies: selfiesList,
    docs: docsList,
    locked: lockedPromotersList,
    candidates: candidatesAwaitingList,
  };
  const activeList = listsByTab[tab] || allList;

  const handleExecuteAction = (reason?: string) => {
    if (!confirmAction) return;
    if (confirmAction.type === "approve") {
      decideMutation.mutate({ item: confirmAction.item, approve: true, reason });
    } else if (confirmAction.type === "reject") {
      decideMutation.mutate({ item: confirmAction.item, approve: false, reason });
    } else if (confirmAction.type === "reset_doc") {
      resetDocTypeMutation.mutate(confirmAction.item.external_id);
    } else if (confirmAction.type === "unlock_material") {
      if (confirmAction.materialId) {
        unlockTrainingMutation.mutate({
          promoterId: confirmAction.item.external_id,
          materialId: confirmAction.materialId,
        });
      }
    }
  };

  return (
    <PageShell
      title="Central de Análises & Revisões do Polo"
      description="Filas de conferência biométrica, documentos e aprovação de promotores com assistência de IA."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-amber-bg px-3 py-1 text-xs font-semibold text-brand-amber border border-brand-amber/30">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Triagem por Risco Ativa</span>
        </div>
      }
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-1.5 bg-white"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Atualizar</span>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-muted" />
            <Input
              placeholder="Buscar por nome, identificador ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={sortByRisk ? "default" : "outline"}
              size="sm"
              onClick={() => setSortByRisk(!sortByRisk)}
              className="gap-1.5 text-xs bg-white text-brand-ink"
            >
              <Sparkles className="h-3.5 w-3.5 text-brand-blue" />
              <span>{sortByRisk ? "Ordenado por Risco (IA)" : "Ordem Padrão"}</span>
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="all">
              <Inbox className="h-4 w-4 mr-1.5" />
              Todas ({allList.length})
            </TabsTrigger>
            <TabsTrigger value="selfies">
              <User className="h-4 w-4 mr-1.5" />
              Selfies ({selfiesList.length})
            </TabsTrigger>
            <TabsTrigger value="docs">
              <FileText className="h-4 w-4 mr-1.5" />
              Documentos & RGs ({docsList.length})
            </TabsTrigger>
            <TabsTrigger value="locked">
              <Lock className="h-4 w-4 mr-1.5" />
              Treino Travado ({lockedPromotersList.length})
            </TabsTrigger>
            <TabsTrigger value="candidates">
              <Award className="h-4 w-4 mr-1.5" />
              Candidatos ({candidatesAwaitingList.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Spinner />
                <p className="text-xs text-brand-muted">Carregando filas de revisão...</p>
              </div>
            ) : activeList.length === 0 ? (
              <div className="text-center py-12 text-xs text-brand-muted">
                Não há itens pendentes de revisão nesta categoria no momento.
              </div>
            ) : (
              <div id="reviews-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeList.map((item, index) => {
                  const risk = evaluateReviewRisk(item);
                  return (
                    <Card
                      key={`${item.external_id}-${index}`}
                      className="flex flex-col justify-between border-brand-border/80 hover:border-brand-blue/50 hover:shadow-md transition-all"
                    >
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <span className="font-bold text-base text-brand-ink line-clamp-1">
                              {item.name || item.doc_type || "Item em Revisão"}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-brand-muted">
                              <span className="capitalize font-medium">
                                {item.type} • {item.kind?.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                          <RiskBadge level={risk.level} />
                        </div>

                        <div className="rounded-lg bg-brand-bg/80 p-2.5 text-xs text-brand-ink space-y-1 border border-brand-border/40">
                          <div className="flex items-center gap-1 font-semibold text-brand-muted">
                            <Sparkles className="h-3 w-3 text-brand-blue" />
                            <span>Síntese da Triagem</span>
                          </div>
                          <p className="text-xs text-brand-muted line-clamp-2 leading-relaxed">
                            {risk.summary}
                          </p>
                        </div>

                        {risk.divergences.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {risk.divergences.map((d, i) => (
                              <DivergenceBadge key={i} label={d} />
                            ))}
                          </div>
                        )}

                        <div className="pt-2 border-t border-brand-border/60 flex items-center gap-2">
                          {item.kind === "locked_training" ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full h-9 text-xs font-semibold bg-brand-green hover:bg-brand-green-dark"
                              onClick={() => {
                                setConfirmAction({
                                  type: "unlock_material",
                                  item,
                                  materialId: "current",
                                });
                              }}
                            >
                              <Unlock className="h-3.5 w-3.5 mr-1" /> Destravar Treino
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-9 text-xs font-semibold"
                              onClick={() => setSelectedItem(item)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> Analisar & Decidir
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {selectedItem && (
        <Dialog open={Boolean(selectedItem)} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-brand-border pb-3">
              <div className="flex items-center justify-between gap-3 pr-6">
                <div>
                  <DialogTitle className="text-xl">
                    {selectedItem.name || selectedItem.doc_type || "Análise de Conformidade"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-brand-muted">
                    ID: {selectedItem.external_id} • Categoria: {selectedItem.type} / {selectedItem.kind}
                  </DialogDescription>
                </div>
                <RiskBadge level={evaluateReviewRisk(selectedItem).level} />
              </div>
            </DialogHeader>

            {loadingDetail ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Spinner />
                <p className="text-xs text-brand-muted">Buscando mídias e dados do cadastro...</p>
              </div>
            ) : (
              <div className="space-y-5 py-2">
                <CaseSummaryCard evaluation={evaluateReviewRisk(selectedItem)} />

                <ComparisonViewer
                  selfieUrl={
                    itemDetail?.selfie?.photo ||
                    itemDetail?.selfie_image ||
                    itemDetail?.selfie?.image
                  }
                  documentUrl={
                    itemDetail?.rg?.front_photo ||
                    itemDetail?.rg?.full_photo ||
                    itemDetail?.document?.front_photo ||
                    itemDetail?.document?.full_photo ||
                    itemDetail?.photo
                  }
                  backDocumentUrl={
                    itemDetail?.rg?.back_photo ||
                    itemDetail?.document?.back_photo
                  }
                  selfieLabel="Selfie do Candidato"
                  documentLabel="Documento RG / CNH"
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-brand-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs text-brand-muted hover:text-brand-ink"
                    onClick={() =>
                      setConfirmAction({
                        type: "reset_doc",
                        item: selectedItem,
                      })
                    }
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Destravar Tipo de Doc
                  </Button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end ml-auto">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() =>
                        setConfirmAction({
                          type: "reject",
                          item: selectedItem,
                        })
                      }
                      disabled={decideMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" /> Rejeitar
                    </Button>

                    <Button
                      type="button"
                      variant="default"
                      className="bg-brand-green hover:bg-brand-green-dark"
                      onClick={() =>
                        setConfirmAction({
                          type: "approve",
                          item: selectedItem,
                        })
                      }
                      disabled={decideMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" /> Aprovar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {confirmAction && (
        <ConfirmDialog
          open={Boolean(confirmAction)}
          onOpenChange={() => setConfirmAction(null)}
          title={
            confirmAction.type === "approve"
              ? "Confirmar Aprovação"
              : confirmAction.type === "reject"
              ? "Rejeitar Validação"
              : confirmAction.type === "unlock_material"
              ? "Destravar Matéria de Treino"
              : "Resetar Tipo de Documento"
          }
          description={
            confirmAction.type === "approve"
              ? `Tem certeza que deseja aprovar este item para "${confirmAction.item.name || "o usuário"}"? A etapa será marcada como validada.`
              : confirmAction.type === "reject"
              ? `Informe o motivo da reprovação para notificar o usuário com clareza.`
              : confirmAction.type === "unlock_material"
              ? `Deseja liberar a matéria pendente para destravar o progresso deste promotor no polo?`
              : `Deseja zerar a seleção de tipo de documento para permitir que o candidato escolha novamente?`
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
          reasonPlaceholder="Descreva a inconformidade identificada..."
          loading={
            decideMutation.isPending ||
            unlockTrainingMutation.isPending ||
            resetDocTypeMutation.isPending
          }
          onConfirm={handleExecuteAction}
        />
      )}
    </PageShell>
  );
}
