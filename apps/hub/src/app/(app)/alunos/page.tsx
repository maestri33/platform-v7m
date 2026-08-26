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
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { formatDateBR } from "@/lib/date";
import { formatPhoneBR } from "@/lib/phone";
import { toast } from "sonner";
import type { HubStudentRow } from "@/lib/types";
import {
  Users,
  Eye,
  Award,
  GraduationCap,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";

export default function AlunosPage() {
  return (
    <React.Suspense fallback={<div>Carregando...</div>}>
      <AlunosContent />
    </React.Suspense>
  );
}

function AlunosContent() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useQueryState("status", { defaultValue: "" });
  const [offset, setOffset] = useQueryState("offset", { defaultValue: "0" });

  const [selectedStudent, setSelectedStudent] = React.useState<HubStudentRow | null>(null);
  const [examModalOpen, setExamModalOpen] = React.useState(false);
  const [examPassed, setExamPassed] = React.useState(true);
  const [examNotes, setExamNotes] = React.useState("");

  const [pendencyModalOpen, setPendencyModalOpen] = React.useState(false);
  const [pendencyKind, setPendencyKind] = React.useState("document");
  const [pendencyDesc, setPendencyDesc] = React.useState("");

  const [clearDocConfirmOpen, setClearDocConfirmOpen] = React.useState(false);

  // Fetch paginado de alunos do polo
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students", statusFilter, offset],
    queryFn: () =>
      apiLeadership.listStudents({
        status: statusFilter || undefined,
        limit: 100,
        offset: Number(offset) || 0,
      }),
  });

  // Detalhe rico do aluno
  const { data: studentDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["student-detail", selectedStudent?.external_id],
    queryFn: () => apiLeadership.getStudent(selectedStudent!.external_id),
    enabled: Boolean(selectedStudent),
  });

  // Mutação: Lançar Nota de Prova
  const gradeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) return;
      return apiLeadership.gradeExam(selectedStudent.external_id, examPassed, examNotes || undefined);
    },
    onSuccess: () => {
      toast.success(examPassed ? "Aluno aprovado na prova!" : "Lançada reprovação com observações.");
      setExamModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student-detail"] });
    },
    onError: (err: any) => {
      toast.error(err.detail || err.message || "Falha ao lançar nota.");
    },
  });

  // Mutação: Liberar Documentação para Diploma
  const clearDocMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) return;
      return apiLeadership.clearStudentDocumentation(selectedStudent.external_id);
    },
    onSuccess: () => {
      toast.success("Documentação confirmada e emissão de diploma liberada!");
      setClearDocConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student-detail"] });
    },
    onError: (err: any) => {
      toast.error(err.detail || err.message || "Falha ao liberar documentação.");
    },
  });

  // Mutação: Abrir Pendência
  const openPendencyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) return;
      return apiLeadership.openStudentPendency(selectedStudent.external_id, {
        kind: pendencyKind,
        description: pendencyDesc,
      });
    },
    onSuccess: () => {
      toast.success("Pendência registrada para o aluno.");
      setPendencyModalOpen(false);
      setPendencyDesc("");
      queryClient.invalidateQueries({ queryKey: ["student-detail"] });
    },
    onError: (err: any) => {
      toast.error(err.detail || err.message || "Falha ao abrir pendência.");
    },
  });

  // Mutação: Resolver Pendência
  const resolvePendencyMutation = useMutation({
    mutationFn: async (pendencyId: string) => {
      return apiLeadership.resolveStudentPendency(pendencyId);
    },
    onSuccess: () => {
      toast.success("Pendência marcada como resolvida!");
      queryClient.invalidateQueries({ queryKey: ["student-detail"] });
    },
    onError: (err: any) => {
      toast.error(err.detail || err.message || "Falha ao resolver pendência.");
    },
  });

  const columns: ColumnDef<HubStudentRow>[] = [
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
      accessorKey: "status",
      header: "Status Acadêmico",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      accessorKey: "created_at",
      header: "Ingresso",
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
          onClick={() => setSelectedStudent(row.original)}
        >
          <Eye className="h-3.5 w-3.5" /> Detalhes
        </Button>
      ),
    },
  ];

  return (
    <PageShell
      title="Alunos do Polo"
      description="Gestão acadêmica, correção de provas, resolução de pendências e liberação de diplomas."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue-bg px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <Users className="h-3.5 w-3.5" />
          <span>{studentsData?.total || 0} Matriculados</span>
        </div>
      }
    >
      <div className="space-y-6">
        <DataTableTanstack
          columns={columns}
          data={studentsData?.items || []}
          searchPlaceholder="Filtrar por nome ou ID..."
          emptyTitle="Nenhum aluno encontrado"
          emptyDescription="Os alunos matriculados no seu polo aparecerão listados aqui."
        />
      </div>

      {/* MODAL DETALHE DO ALUNO */}
      {selectedStudent && (
        <Dialog open={Boolean(selectedStudent)} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-blue" />
                Aluno: {selectedStudent.name || "Detalhes"}
              </DialogTitle>
              <DialogDescription>
                Identificador: {selectedStudent.external_id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-brand-bg/50 p-4 rounded-xl border border-brand-border">
                <div>
                  <span className="text-brand-muted block">Status:</span>
                  <StatusPill status={studentDetail?.status || selectedStudent.status} />
                </div>
                <div>
                  <span className="text-brand-muted block">Telefone:</span>
                  <strong className="text-brand-ink">{formatPhoneBR(selectedStudent.phone)}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">CPF:</span>
                  <strong className="text-brand-ink">{studentDetail?.user?.cpf || "—"}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">Plataforma Login:</span>
                  <strong className="text-brand-ink">{studentDetail?.platform?.login || "—"}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">Diploma:</span>
                  <strong>{studentDetail?.diploma?.issued_at ? "✅ Emitido" : "⏳ Pendente"}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">Retirada:</span>
                  <strong>{studentDetail?.diploma?.picked_up ? "🎓 Entregue" : "Aguardando"}</strong>
                </div>
              </div>

              {/* Lista de Pendências */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                    Pendências Acadêmicas / Documentais
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setPendencyModalOpen(true)}
                  >
                    <Plus className="h-3 w-3" /> Nova Pendência
                  </Button>
                </div>

                {!studentDetail?.pendencies?.length ? (
                  <p className="text-xs text-brand-muted bg-white p-3 rounded-lg border border-brand-border">
                    Nenhuma pendência ativa para este aluno.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {studentDetail.pendencies.map((p: any) => (
                      <div
                        key={p.external_id}
                        className="flex items-center justify-between p-3 rounded-lg border border-brand-border bg-white text-xs"
                      >
                        <div>
                          <span className="font-semibold text-brand-ink block">{p.description}</span>
                          <span className="text-brand-muted">Tipo: {p.kind}</span>
                        </div>
                        {p.resolved ? (
                          <span className="text-brand-green-dark font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Resolvida
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => resolvePendencyMutation.mutate(p.external_id)}
                          >
                            Marcar Resolvida
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações Acadêmicas */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-brand-border">
                <Button
                  variant="action"
                  size="sm"
                  onClick={() => setExamModalOpen(true)}
                  className="gap-1.5"
                >
                  <FileCheck className="h-4 w-4" /> Lançar Nota de Prova
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setClearDocConfirmOpen(true)}
                  className="gap-1.5"
                >
                  <Award className="h-4 w-4" /> Liberar Diploma
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL LANÇAR NOTA DE PROVA */}
      {examModalOpen && (
        <Dialog open={examModalOpen} onOpenChange={setExamModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-brand-blue" />
                Correção de Prova
              </DialogTitle>
              <DialogDescription>
                Lance o resultado oficial da avaliação final do aluno.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant={examPassed ? "action" : "outline"}
                  onClick={() => setExamPassed(true)}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Aprovado
                </Button>
                <Button
                  type="button"
                  variant={!examPassed ? "destructive" : "outline"}
                  onClick={() => setExamPassed(false)}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-1.5" /> Reprovado
                </Button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-ink">Observações / Nota</label>
                <Input
                  placeholder="Ex: Nota 8.5 — Todas as competências atingidas"
                  value={examNotes}
                  onChange={(e) => setExamNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setExamModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={() => gradeMutation.mutate()}
                disabled={gradeMutation.isPending}
              >
                {gradeMutation.isPending ? "Gravando..." : "Salvar Resultado"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL NOVA PENDÊNCIA */}
      {pendencyModalOpen && (
        <Dialog open={pendencyModalOpen} onOpenChange={setPendencyModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-brand-amber" />
                Abrir Pendência para o Aluno
              </DialogTitle>
              <DialogDescription>
                Descreva a pendência para notificação e controle do polo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-ink">Tipo de Pendência</label>
                <select
                  value={pendencyKind}
                  onChange={(e) => setPendencyKind(e.target.value)}
                  className="w-full rounded-lg border border-brand-border bg-white p-2 text-sm text-brand-ink"
                >
                  <option value="document">Documentação Faltante</option>
                  <option value="academic">Pendência Acadêmica</option>
                  <option value="financial">Taxa Residual</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-ink">
                  Descrição <span className="text-brand-danger">*</span>
                </label>
                <Input
                  placeholder="Ex: Certidão de nascimento ilegível"
                  value={pendencyDesc}
                  onChange={(e) => setPendencyDesc(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPendencyModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={() => openPendencyMutation.mutate()}
                disabled={!pendencyDesc.trim() || openPendencyMutation.isPending}
              >
                {openPendencyMutation.isPending ? "Criando..." : "Criar Pendência"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CONFIRMAR LIBERAÇÃO DE DIPLOMA */}
      <ConfirmDialog
        open={clearDocConfirmOpen}
        onOpenChange={setClearDocConfirmOpen}
        title="Liberar Emissão de Diploma"
        description="Confirma que toda a documentação comprobatória e notas foram conferidas pelo polo? Isso habilitará a emissão do certificado."
        confirmText="Confirmar e Liberar"
        variant="action"
        loading={clearDocMutation.isPending}
        onConfirm={() => clearDocMutation.mutate()}
      />
    </PageShell>
  );
}
