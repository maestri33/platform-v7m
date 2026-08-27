"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiCollaborators, type PromoterCommissionRow } from "@/lib/api-collaborators";
import { PageShell } from "@/components/ui/page-shell";
import { DataTableTanstack } from "@/components/ui/data-table-tanstack";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import {
  DollarSign,
  KeyRound,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default function MinhasComissoesPage() {
  const queryClient = useQueryClient();
  const [pixInput, setPixInput] = React.useState("");

  const { data: me } = useQuery({
    queryKey: ["promoter-me"],
    queryFn: () => apiCollaborators.getPromoterMe(),
  });

  const { data: commissions } = useQuery({
    queryKey: ["promoter-my-commissions"],
    queryFn: () => apiCollaborators.listMyCommissions(),
  });

  React.useEffect(() => {
    if (me?.pix_key) {
      setPixInput(me.pix_key);
    }
  }, [me?.pix_key]);

  const updatePixMutation = useMutation({
    mutationFn: async (key: string) => apiCollaborators.updatePixKey(key),
    onSuccess: () => {
      toast.success("Chave PIX atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["promoter-me"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  const columns: ColumnDef<PromoterCommissionRow>[] = [
    {
      accessorKey: "student_name",
      header: "Origem / Matrícula",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-brand-ink">{row.original.student_name || "Comissão de Matrícula"}</div>
          <div className="text-xs text-brand-muted font-mono">{row.original.external_id}</div>
        </div>
      ),
    },
    {
      accessorKey: "amount_cents",
      header: "Valor",
      cell: ({ row }) => (
        <span className="font-bold text-sm text-emerald-600">
          {row.original.amount_formatted || `R$ ${(row.original.amount_cents / 100).toFixed(2)}`}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      accessorKey: "created_at",
      header: "Data de Geração",
      cell: ({ row }) => (
        <span className="text-xs text-brand-muted">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
    },
  ];

  return (
    <PageShell
      title="Extrato de Comissões & PIX"
      description="Consulte o histórico de valores a receber, regras de fechamento e configure sua chave de repasse."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/30">
          <DollarSign className="size-3.5" />
          <span>Fechamento Semanal</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Cartão de Chave PIX e Regra de Pagamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="size-4 text-emerald-600" />
                Minha Chave PIX para Recebimento
              </CardTitle>
              <CardDescription>
                Seus ganhos acumulados serão transferidos diretamente para esta chave.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                  value={pixInput}
                  onChange={(e) => setPixInput(e.target.value)}
                  className="bg-white"
                />
                <Button
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  onClick={() => updatePixMutation.mutate(pixInput)}
                  disabled={!pixInput || updatePixMutation.isPending}
                >
                  {updatePixMutation.isPending ? "Salvando..." : "Salvar PIX"}
                </Button>
              </div>
              <p className="text-[11px] text-brand-muted">
                Certifique-se de que a conta bancária está no mesmo CPF do seu cadastro.
              </p>
            </CardContent>
          </Card>

          <Card className="border-brand-blue/30 bg-brand-blue-bg/20 shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-brand-blue">
                <Calendar className="size-4" />
                Calendário de Repasses
              </CardTitle>
              <CardDescription>
                Regra padrão de apuração e transferência de comissões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-brand-ink">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Toda Sexta-feira às 18:00h</strong>: O sistema consolida as matrículas confirmadas na semana e dispara os repasses via PIX.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Comissão de R$ 100,00 por aluno</strong> matriculado que efetuar o pagamento da 1ª parcela.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Comissões */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-brand-ink">Extrato Detalhado</h3>
          <DataTableTanstack
            columns={columns}
            data={commissions || []}
            searchPlaceholder="Filtrar comissões por matrícula..."
            emptyTitle="Nenhuma comissão encontrada"
            emptyDescription="Quando os seus alunos realizarem o pagamento da matrícula, os lançamentos aparecerão aqui."
          />
        </div>
      </div>
    </PageShell>
  );
}
