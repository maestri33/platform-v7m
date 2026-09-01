"use client";

import { FeedbackModal } from "@v7m/ui";

/**
 * Modal de erro do wizard de matrícula.
 * Padronizado consumindo o FeedbackModal do @v7m/ui.
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
    <FeedbackModal
      title={title}
      description={message}
      variant="danger"
      primaryAction={{
        label: actionLabel,
        onClick: onClose,
      }}
      onClose={onClose}
    />
  );
}
