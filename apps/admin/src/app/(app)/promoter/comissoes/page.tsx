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
import { DollarSign, KeyRound, CheckCircle2, Calendar } from "lucide-react";

export default function PromoterComissoesPage() {
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
      header: "Data",
      cell: ({ row }) => (
        <span className="text-xs text-brand-muted">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
    },
  ];

  return (
    <PageShell
      title="Comissões & PIX"
      subtitle="Extrato de repasses e chave PIX cadastrada."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/30">
          <DollarSign className="size-3.5" />
          <span>Repasse Semanal</span>
        </div>
      }
    >
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Chave PIX e Regra */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <KeyRound className="size-4 text-emerald-600" />
                Chave PIX de Recebimento
              </CardTitle>
              <CardDescription className="text-xs">
                Valores liberados serão transferidos para esta chave.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="CPF, Telefone ou E-mail"
                  value={pixInput}
                  onChange={(e) => setPixInput(e.target.value)}
                  className="bg-white text-xs h-9"
                />
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 h-9"
                  onClick={() => updatePixMutation.mutate(pixInput)}
                  disabled={!pixInput || updatePixMutation.isPending}
                >
                  {updatePixMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-brand-blue/20 bg-brand-blue-bg/20 shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-brand-blue">
                <Calendar className="size-4" />
                Fechamento Automático
              </CardTitle>
              <CardDescription className="text-xs">
                Apuração regular toda sexta-feira
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-brand-ink">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>R$ 100,00 por matrícula confirmada</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>Repasse automático na conta do titular</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Comissões */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-brand-ink">Extrato</h3>
          <DataTableTanstack
            columns={columns}
            data={commissions || []}
            searchPlaceholder="Buscar comissões..."
            emptyTitle="Nenhuma comissão ainda"
            emptyDescription="Seus ganhos serão listados aqui assim que houver matrículas pagas."
          />
        </div>
      </div>
    </PageShell>
  );
}
