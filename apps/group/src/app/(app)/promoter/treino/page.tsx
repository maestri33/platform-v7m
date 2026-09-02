"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiCollaborators, type PromoterTrainingMaterial } from "@/lib/api-collaborators";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { GraduationCap, Play, CheckCircle2 } from "lucide-react";

export default function PromoterTreinoPage() {
  const queryClient = useQueryClient();
  const [selectedMaterial, setSelectedMaterial] = React.useState<PromoterTrainingMaterial | null>(null);
  const [answerInput, setAnswerInput] = React.useState("");

  const { data: materials, isLoading } = useQuery({
    queryKey: ["promoter-training-materials"],
    queryFn: () => apiCollaborators.listMyTrainingMaterials(),
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ materialId, answer }: { materialId: string; answer: string }) => {
      return apiCollaborators.submitQuizAnswer(materialId, answer);
    },
    onSuccess: () => {
      toast.success("Resposta enviada com sucesso!");
      setSelectedMaterial(null);
      setAnswerInput("");
      queryClient.invalidateQueries({ queryKey: ["promoter-training-materials"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const blockingMaterials = materials?.filter((m) => m.blocking) || [];
  const completedCount = blockingMaterials.filter((m) => m.passed).length;
  const progressPct =
    blockingMaterials.length > 0
      ? Math.round((completedCount / blockingMaterials.length) * 100)
      : 100;

  return (
    <PageShell
      title="Treinamentos & Materiais"
      subtitle="Conteúdos e pílulas práticas para potencializar suas vendas."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue-bg px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <GraduationCap className="size-3.5" />
          <span>{progressPct}% Concluído</span>
        </div>
      }
    >
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Barra de Progresso */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-brand-ink">
            <span>Progresso da Trilha</span>
            <span>
              {completedCount} de {blockingMaterials.length} módulos
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-brand-border/60">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Lista de Módulos */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner />
          </div>
        ) : !materials || materials.length === 0 ? (
          <div className="text-center py-12 text-xs text-brand-muted">
            Nenhum material de treinamento disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {materials.map((m) => {
              const isDone = m.passed;
              return (
                <Card
                  key={m.external_id}
                  className={`border-brand-border/80 transition ${
                    isDone ? "bg-slate-50/50" : "hover:border-brand-blue/50 shadow-2xs"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-bold text-brand-ink">
                        {m.title}
                      </CardTitle>
                      {isDone ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="size-3" /> Concluído
                        </span>
                      ) : m.blocking ? (
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Obrigatório
                        </span>
                      ) : null}
                    </div>
                    {m.text_content && (
                      <CardDescription className="text-xs line-clamp-2">
                        {m.text_content}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      size="sm"
                      variant={isDone ? "outline" : "default"}
                      className="w-full text-xs h-8"
                      onClick={() => {
                        setSelectedMaterial(m);
                        setAnswerInput("");
                      }}
                    >
                      {isDone ? "Revisar Módulo" : "Iniciar Módulo"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal de Avaliação / Conteúdo */}
        {selectedMaterial && (
          <Dialog open={!!selectedMaterial} onOpenChange={(open) => !open && setSelectedMaterial(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedMaterial.title}</DialogTitle>
                <DialogDescription>
                  {selectedMaterial.text_content || "Assista ao conteúdo e responda à pergunta abaixo."}
                </DialogDescription>
              </DialogHeader>

              {selectedMaterial.video && (
                <div className="rounded-lg overflow-hidden aspect-video bg-black/90 flex items-center justify-center text-white">
                  <Play className="size-8" />
                </div>
              )}

              {selectedMaterial.question && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-brand-ink">
                    {selectedMaterial.question}
                  </label>
                  <Input
                    placeholder="Digite sua resposta..."
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMaterial(null)}
                >
                  Fechar
                </Button>
                {selectedMaterial.question && (
                  <Button
                    size="sm"
                    disabled={!answerInput || submitAnswerMutation.isPending}
                    onClick={() =>
                      submitAnswerMutation.mutate({
                        materialId: selectedMaterial.external_id,
                        answer: answerInput,
                      })
                    }
                  >
                    {submitAnswerMutation.isPending ? "Enviando..." : "Confirmar Resposta"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PageShell>
  );
}
