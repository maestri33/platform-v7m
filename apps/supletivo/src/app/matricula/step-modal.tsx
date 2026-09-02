"use client";

import { GenericModal } from "@v7m/ui";

/**
 * Modal padronizado de erro do wizard de matrícula usando o GenericModal oficial do @v7m/ui.
 * Totalmente acessível (Radix UI), fecha com Escape, clique fora ou botão,
 * com foco gerenciado automaticamente e tom semântico danger.
 */
export function StepErrorModal({
  title = "Ops, não deu certo",
  message,
  actionLabel = "Entendi",
  onClose,
}: {
  title?: string;
  message: string;
  actionLabel?: string;
  onClose: () => void;
}) {
  return (
    <GenericModal
      open={true}
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={message}
      tone="danger"
      confirmLabel={actionLabel}
      onConfirm={onClose}
    />
  );
}
