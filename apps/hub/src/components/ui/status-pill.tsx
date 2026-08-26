import * as React from "react";
import { Badge } from "./badge";

const STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "success" | "destructive" | "warning" | "outline" }
> = {
  // Matrículas / Leads
  pending: { label: "Pendente", variant: "warning" },
  awaiting_payment: { label: "Aguardando Pagamento", variant: "warning" },
  awaiting_release: { label: "Aguardando Liberação", variant: "secondary" },
  active: { label: "Ativo", variant: "success" },
  completed: { label: "Concluído", variant: "success" },
  failed: { label: "Falhou", variant: "destructive" },
  canceled: { label: "Cancelado", variant: "outline" },
  suspended: { label: "Suspenso", variant: "destructive" },

  // Candidatos
  awaiting_approval: { label: "Aguardando Aprovação", variant: "warning" },
  approved: { label: "Aprovado", variant: "success" },
  rejected: { label: "Rejeitado", variant: "destructive" },

  // Alunos / Diplomas
  exam_released: { label: "Prova Liberada", variant: "secondary" },
  exam_passed: { label: "Aprovado na Prova", variant: "success" },
  exam_failed: { label: "Reprovado na Prova", variant: "destructive" },
  documentation_cleared: { label: "Documentação Liberada", variant: "success" },
  diploma_issued: { label: "Diploma Emitido", variant: "success" },
  veteran: { label: "Veterano / Entregue", variant: "success" },

  // Análise / Validação
  manual_review: { label: "Revisão Manual", variant: "warning" },
  verified: { label: "Verificado", variant: "success" },
  valid: { label: "Válido", variant: "success" },
  invalid: { label: "Inválido", variant: "destructive" },
  locked: { label: "Travado no Treino", variant: "destructive" },
};

interface StatusPillProps {
  status: string | null | undefined;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  if (!status) {
    return (
      <Badge variant="outline" className={className}>
        —
      </Badge>
    );
  }

  const normalized = status.toLowerCase();
  const config = STATUS_MAP[normalized] || {
    label: status.replace(/_/g, " "),
    variant: "secondary",
  };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
