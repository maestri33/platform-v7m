"use client";

import * as React from "react";
import {
  IconFileText,
  IconCloudUpload,
  IconCircleCheck,
  IconAlertTriangle,
  IconRefresh,
  IconEye,
  IconDownload,
  IconCamera,
  IconLoader2,
  IconHelpCircle,
  IconFileCheck,
} from "@tabler/icons-react";
import { Button } from "../primitives/button";
import { Badge } from "../primitives/badge";
import { GenericModal } from "../primitives/generic-modal";
import { cn } from "../lib/utils";

export type DocumentStageStatus =
  | "empty"
  | "analyzing"
  | "needs_back"
  | "needs_front"
  | "pending_review"
  | "approved"
  | "rejected";

export interface ClassifyResult {
  is_document?: boolean | null;
  doc_type?: string | null;
  completeness?: "front" | "back" | "full" | null;
  is_legible?: boolean | null;
  reason?: string | null;
  confidence?: number | null;
}

export interface DocumentCaptureCardProps {
  id: string;
  title: string;
  description: string;
  category?: string;
  status: DocumentStageStatus;
  fileUrl?: string | null;
  fileName?: string | null;
  reason?: string | null;
  updatedAt?: string | null;
  /** Chamada rápida de IA para pré-classificação (Groq/OmniRoute em < 1.5s). */
  onClassify?: (file: File) => Promise<ClassifyResult>;
  /** Envio físico do documento para o backend. */
  onUpload: (file: File, side?: "front" | "back" | "full") => Promise<void>;
  /** Visualização do documento já aprovado (função GET / CRUD). */
  onViewDocument?: (fileUrl: string, fileName?: string | null) => void;
  /** Ação de substituição/reenvio quando reprovado. */
  onRetry?: () => void;
  className?: string;
}

/**
 * Componente Progressivo de Captura de Documentos com IA First & Ciclo CRUD.
 * - Analisa rapidamente a foto (frente, verso ou documento inteiro).
 * - Se detecta só frente, solicita progressivamente o verso.
 * - Se detecta documento inteiro, envia e assume estado "Em análise".
 * - Quando aprovado pelo backend, serve como visualizador (GET).
 */
export function DocumentCaptureCard({
  id,
  title,
  description,
  status: externalStatus,
  fileUrl,
  fileName,
  reason,
  updatedAt,
  onClassify,
  onUpload,
  onViewDocument,
  onRetry,
  className = "",
}: DocumentCaptureCardProps) {
  const [internalStatus, setInternalStatus] = React.useState<DocumentStageStatus>(externalStatus);
  const [analyzingStep, setAnalyzingStep] = React.useState<string>("");
  const [frontFile, setFrontFile] = React.useState<File | null>(null);
  const [warningModal, setWarningModal] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    fileToBypass?: File | null;
  }>({
    open: false,
    title: "",
    description: "",
  });

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const pendingSideRef = React.useRef<"front" | "back" | "full">("full");

  // Sincroniza com status externo se modificado pelo backend
  React.useEffect(() => {
    setInternalStatus(externalStatus);
  }, [externalStatus]);

  const triggerSelect = (side: "front" | "back" | "full" = "full") => {
    pendingSideRef.current = side;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const processFile = async (file: File) => {
    // 1. Pré-análise IA rápida se houver classificador
    if (onClassify) {
      try {
        setInternalStatus("analyzing");
        setAnalyzingStep("Verificando documento com IA...");

        const result = await onClassify(file);

        // Se a IA indicar que não é documento ou é ilegível
        if (result.is_document === false || result.is_legible === false) {
          setWarningModal({
            open: true,
            title: "Atenção na foto enviada",
            description:
              result.reason ||
              "A imagem não parece nítida ou legível. Certifique-se de fotografar em um ambiente bem iluminado e sem reflexos.",
            fileToBypass: file,
          });
          setInternalStatus("empty");
          return;
        }

        // Se for só frente e o documento exige verso
        if (result.completeness === "front") {
          setFrontFile(file);
          setInternalStatus("needs_back");
          return;
        }

        // Se for só verso e não tínhamos a frente
        if (result.completeness === "back" && !frontFile) {
          setInternalStatus("needs_front");
          return;
        }
      } catch {
        // Fall-through resiliente: se a IA falhar ou estiver offline, não trava o usuário
      }
    }

    // 2. Upload final para o backend
    try {
      setInternalStatus("analyzing");
      setAnalyzingStep("Enviando arquivo com segurança...");
      await onUpload(file, pendingSideRef.current);
      setInternalStatus("pending_review");
    } catch {
      setInternalStatus("empty");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleBypassWarning = async () => {
    const file = warningModal.fileToBypass;
    setWarningModal({ open: false, title: "", description: "", fileToBypass: null });
    if (!file) return;

    try {
      setInternalStatus("analyzing");
      setAnalyzingStep("Enviando arquivo...");
      await onUpload(file, pendingSideRef.current);
      setInternalStatus("pending_review");
    } catch {
      setInternalStatus("empty");
    }
  };

  // Status derivados
  const isApproved = internalStatus === "approved";
  const isPendingReview = internalStatus === "pending_review";
  const isAnalyzing = internalStatus === "analyzing";
  const isNeedsBack = internalStatus === "needs_back";
  const isNeedsFront = internalStatus === "needs_front";
  const isRejected = internalStatus === "rejected";
  const isEmpty = internalStatus === "empty";

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-xs",
          isApproved && "border-emerald-500/30 bg-emerald-50/20",
          isPendingReview && "border-amber-400/40 bg-amber-50/20",
          isAnalyzing && "border-blue-400/40 bg-blue-50/20",
          (isNeedsBack || isNeedsFront) && "border-blue-500/50 bg-blue-50/30 ring-2 ring-blue-500/20",
          isRejected && "border-rose-500/40 bg-rose-50/20",
          isEmpty && "border-slate-200 bg-white hover:border-slate-300",
          className
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="space-y-3">
          {/* Header do Card */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2.5 rounded-xl transition-colors",
                  isApproved && "bg-emerald-500/10 text-emerald-600",
                  isPendingReview && "bg-amber-500/10 text-amber-600",
                  isAnalyzing && "bg-blue-500/10 text-blue-600 animate-pulse",
                  (isNeedsBack || isNeedsFront) && "bg-blue-600 text-white",
                  isRejected && "bg-rose-500/10 text-rose-600",
                  isEmpty && "bg-slate-100 text-slate-600"
                )}
              >
                {isApproved ? (
                  <IconCircleCheck className="size-5" />
                ) : isRejected ? (
                  <IconAlertTriangle className="size-5" />
                ) : isPendingReview ? (
                  <IconFileCheck className="size-5" />
                ) : (
                  <IconFileText className="size-5" />
                )}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">{title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              </div>
            </div>

            {/* Badges de Status */}
            <div>
              {isApproved && <Badge variant="success">Aprovado</Badge>}
              {isPendingReview && <Badge variant="warning">Em análise</Badge>}
              {isAnalyzing && <Badge variant="secondary">Analisando...</Badge>}
              {isNeedsBack && <Badge variant="default">Falta o Verso</Badge>}
              {isNeedsFront && <Badge variant="default">Falta a Frente</Badge>}
              {isRejected && <Badge variant="destructive">Reprovado</Badge>}
              {isEmpty && <Badge variant="outline">Pendente</Badge>}
            </div>
          </div>

          {/* Feedback ou Instruções Progressivas */}
          {isNeedsBack && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-center justify-between gap-2">
              <span className="font-semibold">
                ✓ Frente recebida. Agora fotografe o verso da identidade.
              </span>
              <Button size="sm" variant="default" onClick={() => triggerSelect("back")}>
                Enviar Verso
              </Button>
            </div>
          )}

          {isNeedsFront && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-center justify-between gap-2">
              <span className="font-semibold">
                ✓ Verso recebido. Agora fotografe a frente da identidade.
              </span>
              <Button size="sm" variant="default" onClick={() => triggerSelect("front")}>
                Enviar Frente
              </Button>
            </div>
          )}

          {isPendingReview && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 flex items-center gap-2">
              <IconRefresh className="size-4 animate-spin text-amber-600 shrink-0" />
              <span>
                Documento recebido! Nossa equipe ou validação automática está conferindo os dados.
              </span>
            </div>
          )}

          {isRejected && reason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-900">
              <span className="font-bold">Motivo da reprovação: </span>
              {reason}
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center gap-2 text-xs text-blue-700 py-1">
              <IconLoader2 className="size-4 animate-spin shrink-0" />
              <span>{analyzingStep}</span>
            </div>
          )}
        </div>

        {/* Ações Inferiores (CRUD) */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {isApproved ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <IconCircleCheck className="size-4" /> Válido no MEC
              </span>
              {fileUrl && onViewDocument && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => onViewDocument(fileUrl, fileName)}
                >
                  <IconEye className="size-3.5" /> Visualizar Documento
                </Button>
              )}
            </div>
          ) : isPendingReview ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500">
                {fileName ? `Arquivo: ${fileName}` : "Protocolado"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-slate-500 hover:text-slate-900"
                onClick={() => triggerSelect("full")}
              >
                Substituir
              </Button>
            </div>
          ) : isRejected ? (
            <Button
              size="sm"
              variant="destructive"
              className="w-full gap-2 text-xs"
              onClick={() => {
                if (onRetry) onRetry();
                triggerSelect("full");
              }}
            >
              <IconRefresh className="size-3.5" /> Enviar Novo Documento
            </Button>
          ) : isEmpty ? (
            <Button
              size="sm"
              variant="primary"
              className="w-full gap-2 text-xs"
              onClick={() => triggerSelect("full")}
            >
              <IconCloudUpload className="size-4" /> Enviar Documento
            </Button>
          ) : null}
        </div>
      </div>

      {/* Modal de Alerta / Validação Rápida da IA com Opção de Bypass */}
      <GenericModal
        open={warningModal.open}
        onOpenChange={(open) =>
          setWarningModal((prev) => ({ ...prev, open, fileToBypass: open ? prev.fileToBypass : null }))
        }
        tone="warning"
        title={warningModal.title}
        description={warningModal.description}
        cancelLabel="Tirar outra foto"
        onCancel={() => triggerSelect("full")}
        confirmLabel="Enviar mesmo assim"
        onConfirm={handleBypassWarning}
      />
    </>
  );
}
