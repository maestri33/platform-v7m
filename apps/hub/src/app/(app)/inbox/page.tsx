"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { apiLeadership } from "@/lib/api-leadership";
import { PageShell } from "@/components/layout/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { RiskBadge } from "@/components/common/risk-badge";
import { DivergenceBadge } from "@/components/common/divergence-badge";
import { CaseSummaryCard } from "@/components/common/case-summary-card";
import { ComparisonViewer } from "@/components/common/comparison-viewer";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { evaluateReviewRisk, sortReviewsByRisk } from "@/lib/risk-analysis";
import { formatDateBR } from "@/lib/date";
import { toast } from "sonner";
import type { ReviewItem } from "@/lib/types";
import {
  Inbox,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Award,
  AlertTriangle,
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

export default function InboxPage() {
  return (
    <React.Suspense fallback={<div>Carregando...</div>}>
      <InboxContent />
    </React.Suspense>
  );
}

function InboxContent() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useQueryState("tab", { defaultValue: "all" });
  const [search, setSearch] = useQueryState("q", { defaultValue: "" });
  const [sortByRisk, setSortByRisk] = useQueryState("risk", { defaultValue: "true" });

  // Modal de Detalhe e Decisão do Caso
  const [selectedItem, setSelectedItem] = React.useState<ReviewItem | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<{
    type: "approve" | "reject" | "reset_doc" | "unlock_material";
    item: ReviewItem;
    materialId?: string;
  } | null>(null);

  // Fetch das revisões
  const { data: reviews, isLoading, refetch } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => apiLeadership.listReviews(),
  });

  // Query do detalhe rico do item selecionado
  const { data: itemDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["review-detail", selectedItem?.type, selectedItem?.external_id],
    queryFn: async () => {
      if (!selectedItem) return null;
      if (selectedItem.type === "candidate") {
        if (selectedItem.kind === "selfie") {
          return apiLeadership.getCandidateSelfie(selectedItem.external_id);
        }
        return apiLeadership.getCandidateDetail(selectedItem.external_id);
      }
      if (selectedItem.type === "enrollment") {
        return apiLeadership.getEnrollment(selectedItem.external_id);
      }
      if (selectedItem.type === "student") {
        return apiLeadership.getStudent(selectedItem.external_id);
      }
      return null;
    },
    enabled: Boolean(selectedItem),
  });

  // Mutações de Decisão
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

      if (item.type === "enrollment") {
        if (item.kind === "rg") {
          return apiLeadership.decideEnrollmentRg(id, approve, reason);
        }
        if (item.kind === "address_proof") {
          return apiLeadership.decideEnrollmentAddressProof(id, approve, reason);
        }
        return apiLeadership.decideEnrollmentSelfie(id, approve, reason);
      }

      if (item.type === "candidate") {
        if (item.kind === "selfie") {
          return apiLeadership.decideCandidateSelfie(id, approve, reason);
        }
        if (item.kind === "document") {
          return apiLeadership.decideCandidateDocument(id, approve, reason);
        }
        if (item.kind === "awaiting_approval") {
          return approve
            ? apiLeadership.approveCandidate(id)
            : apiLeadership.rejectCandidate(id, reason || "Rejeitado pelo coordenador.");
        }
      }

      if (item.type === "student") {
        const docId = item.document_external_id || id;
        return apiLeadership.decideStudentDocument(id, docId, approve, reason);
      }

      throw new Error("Tipo de revisão desconhecido.");
    },
    onSuccess: () => {
      toast.success("Operação concluída com sucesso.");
      setConfirmAction(null);
      setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err: any) => {
      toast.error(err.detail || err.message || "Falha ao processar decisão.");
    },
  });

  // Mutação para destravar treino de promotor
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
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["promoters"] });
    },
    onError: (err: any) => {
      toast.error(err.detail || err.message || "Falha ao destravar matéria de treino.");
    },
  });

  // Mutação para resetar tipo de documento
  const resetDocTypeMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      return apiLeadership.resetCandidateDocType(candidateId);
    },
    onSuccess: () => {
      toast.success("Tipo de documento resetado com sucesso.");
      setConfirmAction(null);
      setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (err: any) => {
      toast.error(err.detail || err.message || "Falha ao resetar tipo de documento.");
    },
  });

  // Agrupamentos por categoria
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

    // Filtrar por busca
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
      return sortByRisk === "true" ? sortReviewsByRisk(filtered) : filtered;
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
  const activeList = listsByTab[tab || "all"] || allList;

  // Handler de confirmação final
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
      title="Central de Análises & Revisões"
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
        {/* Filter and Search Bar */}
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
              variant={sortByRisk === "true" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSortByRisk(sortByRisk === "true" ? "false" : "true")}
              className="gap-1.5 text-xs bg-white"
            >
              <Sparkles className="h-3.5 w-3.5 text-brand-blue" />
              <span>{sortByRisk === "true" ? "Ordenado por Risco (IA)" : "Ordem Padrão"}</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
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
                <Spinner size="lg" />
                <p className="text-xs text-brand-muted">Carregando filas de revisão...</p>
              </div>
            ) : activeList.length === 0 ? (
              <EmptyState
                title="Nenhum item nesta fila"
                description="Não há itens pendentes de revisão nesta categoria no momento."
              />
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

                        {/* AI Summary snippet */}
                        <div className="rounded-lg bg-brand-bg/80 p-2.5 text-xs text-brand-ink space-y-1 border border-brand-border/40">
                          <div className="flex items-center gap-1 font-semibold text-brand-muted">
                            <Sparkles className="h-3 w-3 text-brand-blue" />
                            <span>Síntese da Triagem</span>
                          </div>
                          <p className="text-xs text-brand-muted line-clamp-2 leading-relaxed">
                            {risk.summary}
                          </p>
                        </div>

                        {/* Divergences list */}
                        {risk.divergences.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {risk.divergences.map((d, i) => (
                              <DivergenceBadge key={i} label={d} />
                            ))}
                          </div>
                        )}

                        <div className="text-[11px] text-brand-muted pt-1">
                          Entrou na fila: {item.since ? formatDateBR(item.since) : "Recentemente"}
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-brand-border/60 flex items-center gap-2">
                          {item.kind === "locked_training" ? (
                            <Button
                              variant="action"
                              size="sm"
                              className="w-full h-9 text-xs font-semibold"
                              onClick={() => {
                                const matId =
                                  (item.pending_materials?.[0]?.external_id as string) ||
                                  (item.document_external_id as string) ||
                                  "general";
                                setConfirmAction({
                                  type: "unlock_material",
                                  item,
                                  materialId: matId,
                                });
                              }}
                            >
                              <Unlock className="h-3.5 w-3.5 mr-1" /> Destravar Treino
                            </Button>
                          ) : (
                            <Button
                              variant="default"
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

      {/* MODAL DE DETALHE RICO E DECISÃO HUMANA */}
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
                <Spinner size="lg" />
                <p className="text-xs text-brand-muted">Buscando mídias e dados do cadastro...</p>
              </div>
            ) : (
              <div className="space-y-5 py-2">
                {/* AI Case Summary */}
                <CaseSummaryCard evaluation={evaluateReviewRisk(selectedItem)} />

                {/* Comparison Viewer: Selfie vs Document */}
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
                  selfieLabel={`Selfie (${itemDetail?.selfie?.status || "Pendente"})`}
                  documentLabel={`Documento RG / CNH (${itemDetail?.rg?.validation_status || "Em Revisão"})`}
                />

                {/* Extracted Metadata Inspection */}
                <div className="rounded-xl border border-brand-border bg-white p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                    Dados Extraídos & Cadastro
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-brand-muted block">Nome Cadastrado:</span>
                      <strong className="text-brand-ink">{itemDetail?.user?.name || selectedItem.name || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-brand-muted block">CPF:</span>
                      <strong className="text-brand-ink">{itemDetail?.user?.cpf || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-brand-muted block">Telefone:</span>
                      <strong className="text-brand-ink">{itemDetail?.user?.phone || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-brand-muted block">Nome da Mãe:</span>
                      <strong className="text-brand-ink">
                        {itemDetail?.profile?.mother_name || itemDetail?.mother_name || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-brand-muted block">Naturalidade:</span>
                      <strong className="text-brand-ink">
                        {itemDetail?.profile?.birthplace || itemDetail?.birthplace || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-brand-muted block">Status Atual:</span>
                      <StatusPill status={itemDetail?.status || selectedItem.kind} />
                    </div>
                  </div>
                </div>

                {/* Decision Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-brand-border">
                  {selectedItem.type === "candidate" && selectedItem.kind === "document" && (
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
                  )}

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
                      className="flex-1 sm:flex-none"
                    >
                      <X className="h-4 w-4 mr-1" /> Rejeitar com Motivo
                    </Button>

                    <Button
                      type="button"
                      variant="action"
                      onClick={() =>
                        setConfirmAction({
                          type: "approve",
                          item: selectedItem,
                        })
                      }
                      disabled={decideMutation.isPending}
                      className="flex-1 sm:flex-none shadow-sm"
                    >
                      <Check className="h-4 w-4 mr-1" /> Aprovar Documento / Biometria
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG DE CONFIRMAÇÃO DE AÇÃO */}
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
          variant={confirmAction.type === "reject" ? "destructive" : "action"}
          requireReason={confirmAction.type === "reject"}
          reasonPlaceholder="Descreva a inconformidade identificada (ex: Documento ilegível, foto borrada)..."
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
