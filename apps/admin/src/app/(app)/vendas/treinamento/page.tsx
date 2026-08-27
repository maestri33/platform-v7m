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
import {
  GraduationCap,
  Play,
  CheckCircle2,
} from "lucide-react";

export default function MeuTreinamentoPage() {
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
      toast.success("Resposta enviada com sucesso! Avaliação em processamento.");
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
      title="Minha Capacitação & LMS"
      description="Trilhas de formação, vídeos e quizzes para capacitação e liberação de recebimento de comissões."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue-bg px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <GraduationCap className="size-3.5" />
          <span>{progressPct}% Concluído</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Barra de Progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-brand-ink">
            <span>Progresso da Trilha Obrigatória</span>
            <span>
              {completedCount} de {blockingMaterials.length} módulos concluídos
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-brand-border/60">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((m) => {
              const isDone = m.passed;
              return (
                <Card
                  key={m.external_id}
                  className={`border-brand-border/80 transition-all ${
                    isDone ? "bg-slate-50/50" : "hover:border-brand-blue/50 shadow-2xs"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg ${
                            isDone
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-brand-blue/10 text-brand-blue"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="size-4" /> : <Play className="size-4" />}
                        </div>
                        <div>
                          <CardTitle className="text-sm">{m.title}</CardTitle>
                          <CardDescription className="text-xs">
                            {m.blocking ? "Obrigatório" : "Opcional"}
                          </CardDescription>
                        </div>
                      </div>
                      {isDone ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                          Concluído ✓
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                          Pendente
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {m.text_content && (
                      <p className="text-xs text-brand-muted line-clamp-2 leading-relaxed">
                        {m.text_content}
                      </p>
                    )}
                    <Button
                      variant={isDone ? "outline" : "default"}
                      size="sm"
                      className="w-full text-xs font-semibold"
                      onClick={() => {
                        setSelectedMaterial(m);
                        setAnswerInput("");
                      }}
                    >
                      {isDone ? "Revisar Conteúdo" : "Assistir & Responder Quiz"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Quiz / Estudo */}
      {selectedMaterial && (
        <Dialog open={Boolean(selectedMaterial)} onOpenChange={() => setSelectedMaterial(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="size-5 text-brand-blue" />
                {selectedMaterial.title}
              </DialogTitle>
              <DialogDescription>
                {selectedMaterial.blocking ? "Módulo obrigatório para formação de promotores." : "Módulo complementar."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {selectedMaterial.text_content && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-brand-border text-brand-ink leading-relaxed">
                  {selectedMaterial.text_content}
                </div>
              )}

              {selectedMaterial.question && (
                <div className="space-y-2">
                  <label className="font-bold text-brand-ink block">
                    Pergunta Avaliativa: {selectedMaterial.question}
                  </label>
                  <Input
                    placeholder="Digite sua resposta..."
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    className="bg-white"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedMaterial(null)}>
                Fechar
              </Button>
              {selectedMaterial.question && (
                <Button
                  variant="default"
                  className="bg-brand-blue text-white"
                  onClick={() =>
                    submitAnswerMutation.mutate({
                      materialId: selectedMaterial.external_id,
                      answer: answerInput,
                    })
                  }
                  disabled={!answerInput || submitAnswerMutation.isPending}
                >
                  {submitAnswerMutation.isPending ? "Enviando..." : "Submeter Resposta"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageShell>
  );
}
