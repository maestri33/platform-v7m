"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "action" | "destructive";
  requireReason?: boolean;
  reasonPlaceholder?: string;
  loading?: boolean;
  onConfirm: (reason?: string) => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  requireReason = false,
  reasonPlaceholder = "Informe o motivo...",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setReason("");
      setError(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError(true);
      return;
    }
    onConfirm(reason.trim() || undefined);
  };

  const Icon = variant === "destructive" ? AlertCircle : CheckCircle2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-full p-2.5 ${
                variant === "destructive"
                  ? "bg-brand-danger-bg text-brand-danger"
                  : "bg-brand-green-bg text-brand-green-dark"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        {requireReason && (
          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold text-brand-ink">
              Motivo obrigatório <span className="text-brand-danger">*</span>
            </label>
            <Input
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(false);
              }}
              error={error}
              autoFocus
            />
            {error && (
              <p className="text-xs text-brand-danger">
                É necessário informar um motivo para prosseguir.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Processando..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
