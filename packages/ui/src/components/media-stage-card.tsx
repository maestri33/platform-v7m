"use client";

import React from "react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconDownload,
  IconEye,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";
import { BackgroundGradient, type GradientTone } from "./background-gradient";
import { ChromaticImage } from "./chromatic-image";
import { FileUploadDropzone } from "./file-upload-dropzone";

export type MediaStageStatus = "empty" | "analyzing" | "approved" | "rejected";

export interface MediaStageCardProps {
  title: string;
  description?: string;
  status: MediaStageStatus;
  fileUrl?: string | null;
  fileName?: string | null;
  reason?: string | null;
  accept?: string;
  capture?: "user" | "environment";
  toneOverride?: GradientTone;
  className?: string;
  containerClassName?: string;
  onUpload: (file: File) => void | Promise<void>;
  onView?: (url: string) => void;
  onDownload?: (url: string) => void;
  onRetry?: () => void;
  children?: React.ReactNode;
}

const STATUS_CONFIG: Record<
  MediaStageStatus,
  {
    tone: GradientTone;
    badgeLabel: string;
    badgeClass: string;
  }
> = {
  empty: {
    tone: "danger",
    badgeLabel: "Pendente",
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50",
  },
  rejected: {
    tone: "danger",
    badgeLabel: "Recusado / Ajustar",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50",
  },
  analyzing: {
    tone: "warning",
    badgeLabel: "Em análise",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50",
  },
  approved: {
    tone: "success",
    badgeLabel: "Aprovado",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50",
  },
};

/**
 * MediaStageCard (Universal Asset Lifecycle Container).
 *
 * Componente genérico para gerenciar o ciclo de vida de mídias e arquivos
 * (documentos, fotos de perfil, comprovantes PIX, diplomas, banners).
 *
 * - A borda e o glow do BackgroundGradient mudam conforme o status:
 *   - danger (vermelho): vazio / rejeitado / ação urgente
 *   - warning (laranja/âmbar): enviado / em análise / IA processando
 *   - success (verde/azul claro): aprovado / ativo / validado
 * - Troca fluida de conteúdo interno (Dropzone ➔ Scanner ➔ ChromaticImage com CRUD).
 */
export function MediaStageCard({
  title,
  description,
  status,
  fileUrl,
  fileName,
  reason,
  accept = "image/*,application/pdf",
  capture,
  toneOverride,
  className = "",
  containerClassName = "",
  onUpload,
  onView,
  onDownload,
  onRetry,
  children,
}: MediaStageCardProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.empty;
  const tone = toneOverride ?? config.tone;

  function handleDefaultView() {
    if (!fileUrl) return;
    if (onView) {
      onView(fileUrl);
    } else if (typeof window !== "undefined") {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  }

  function handleDefaultDownload() {
    if (!fileUrl) return;
    if (onDownload) {
      onDownload(fileUrl);
    } else if (typeof window !== "undefined") {
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = fileName || "arquivo";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  return (
    <BackgroundGradient
      tone={tone}
      containerClassName={`w-full max-w-lg mx-auto transition-all duration-500 ${containerClassName}`}
      className={`rounded-[22px] bg-white p-5 sm:p-6 dark:bg-zinc-900 shadow-xl border border-slate-100 dark:border-zinc-800 ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}
        >
          {status === "approved" && <IconCircleCheck className="size-3.5" />}
          {status === "analyzing" && <IconLoader2 className="size-3.5 animate-spin" />}
          {(status === "empty" || status === "rejected") && (
            <IconAlertTriangle className="size-3.5" />
          )}
          {config.badgeLabel}
        </span>
      </div>

      {/* Conteúdo dinâmico por estado */}
      <div className="pt-4">
        {/* Estado 1: Vazio */}
        {status === "empty" && (
          <FileUploadDropzone
            accept={accept}
            capture={capture}
            onFileSelect={onUpload}
          />
        )}

        {/* Estado 2: Rejeitado / Pendência com motivo */}
        {status === "rejected" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <IconAlertTriangle className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-bold">Atenção ao envio anterior:</p>
                <p className="mt-0.5 leading-relaxed">
                  {reason || "O arquivo enviado não pôde ser validado. Por favor, envie novamente."}
                </p>
              </div>
            </div>

            <FileUploadDropzone
              label="Enviar novo arquivo para correção"
              hint="Certifique-se de que o texto esteja legível e sem cortes."
              accept={accept}
              capture={capture}
              onFileSelect={onUpload}
              compact
            />
          </div>
        )}

        {/* Estado 3: Em análise */}
        {status === "analyzing" && (
          <div className="relative flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/40 p-8 text-center dark:border-amber-900/40 dark:bg-amber-950/20 min-h-[200px]">
            <div className="relative flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300 shadow-sm">
              <IconLoader2 className="size-7 animate-spin" />
            </div>

            <p className="mt-4 text-sm font-bold text-slate-800 dark:text-zinc-100">
              Processando e validando mídia...
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 max-w-xs">
              A conferência automática e análise de legibilidade estão sendo executadas.
            </p>

            {/* Linha de pulso simulando scanner */}
            <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/60">
              <div className="h-full w-full animate-pulse bg-amber-500 dark:bg-amber-400" />
            </div>
          </div>
        )}

        {/* Estado 4: Aprovado (Exibição rica com ChromaticImage e Ações CRUD) */}
        {status === "approved" && fileUrl && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-slate-50 dark:bg-zinc-950">
              <ChromaticImage
                src={fileUrl}
                alt={title}
                className="max-h-72 w-full object-cover"
                onClick={handleDefaultView}
              />
            </div>

            {/* Ações CRUD */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDefaultView}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                >
                  <IconEye className="size-3.5" />
                  Visualizar
                </button>

                <button
                  type="button"
                  onClick={handleDefaultDownload}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 active:scale-95"
                >
                  <IconDownload className="size-3.5" />
                  Baixar
                </button>
              </div>

              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                >
                  <IconRefresh className="size-3" />
                  Substituir
                </button>
              )}
            </div>
          </div>
        )}

        {children}
      </div>
    </BackgroundGradient>
  );
}
