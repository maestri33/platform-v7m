"use client";

import * as React from "react";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { cn } from "../lib/utils";

export type ModalTone = "default" | "success" | "warning" | "danger" | "info";

export interface GenericModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modal?: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: ModalTone;
  icon?: React.ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

const TONE_ICONS: Record<ModalTone, React.ReactNode> = {
  default: null,
  success: <IconCircleCheck className="size-6 text-emerald-500" />,
  warning: <IconAlertTriangle className="size-6 text-amber-500" />,
  danger: <IconAlertCircle className="size-6 text-rose-500" />,
  info: <IconInfoCircle className="size-6 text-blue-500" />,
};

/**
 * Modal universal do ecossistema V7M.
 * Padroniza títulos, ícones de estado, feedback visual, loading e ações de confirmação/cancelamento.
 */
export function GenericModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  tone = "default",
  icon,
  confirmLabel,
  onConfirm,
  cancelLabel,
  onCancel,
  loading = false,
  size = "md",
  modal = true,
  className = "",
}: GenericModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const displayIcon = icon ?? TONE_ICONS[tone];

  const handleConfirm = async () => {
    if (!onConfirm) return;
    try {
      setIsSubmitting(true);
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const isBusy = loading || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={isBusy ? () => {} : onOpenChange} modal={modal}>
      <DialogContent className={cn(SIZE_CLASSES[size], className)}>
        <DialogHeader className="gap-2">
          {displayIcon && <div className="mb-1">{displayIcon}</div>}
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-slate-500 leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children && <div className="py-2 text-slate-700">{children}</div>}

        {(footer !== undefined || confirmLabel || cancelLabel) && (
          <DialogFooter className="gap-2 pt-3 sm:gap-2">
            {footer !== undefined ? (
              footer
            ) : (
              <>
                {cancelLabel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isBusy}
                  >
                    {cancelLabel}
                  </Button>
                )}
                {confirmLabel && (
                  <Button
                    type="button"
                    variant={tone === "danger" ? "destructive" : "primary"}
                    onClick={handleConfirm}
                    loading={isBusy}
                  >
                    {confirmLabel}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
