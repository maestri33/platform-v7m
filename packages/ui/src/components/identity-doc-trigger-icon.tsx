"use client";

import * as React from "react";
import {
  IconId,
  IconIdBadge2,
  IconFileCheck,
  IconAlertTriangle,
  IconCheck,
  IconArrowRight,
  IconLoader2,
  IconEye,
  IconZoomIn,
  IconZoomOut,
  IconRotate,
  IconX,
  IconFileTypePdf,
  IconCamera,
  IconUpload,
  IconRefresh,
} from "@tabler/icons-react";
import { cn } from "../lib/utils";
import { FileUpload } from "./file-upload";

export type IdentityDocStatus =
  | "ok"
  | "approved"
  | "verified"
  | "analyzing"
  | "review"
  | "pending"
  | "empty"
  | "rejected"
  | "needs_action";

export type IdentityRole = "student" | "promoter";

export interface IdentityDocFile {
  url: string;
  label?: string;
  type?: "front" | "back" | "full";
  title?: string;
  mimeType?: string;
}

export interface FastClassifyResult {
  docType: "rg" | "cnh" | "other" | null;
  isOfficialCnhPdf?: boolean;
  sidesPresent: "front" | "back" | "both" | null;
  isLegible: boolean;
  rejectionReason: string | null;
}

export interface IdentityDocTriggerIconProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Status do documento */
  status?: IdentityDocStatus;
  /** Papel do usuário (aluno rejeita CNH; promotor aceita) */
  role?: IdentityRole;
  /** Motivo da rejeição se houver */
  rejectionReason?: string | null;
  /** Tamanho do ícone/gatilho */
  size?: "sm" | "md" | "lg" | "xl";
  /** Rótulo opcional */
  label?: string;
  /** Descrição de suporte */
  sublabel?: string;
  /** Variante: apenas ícone ou barra de card */
  variant?: "icon-only" | "card" | "floating";
  /** Se deve pulsar no estado de atenção/análise */
  pulse?: boolean;
  /** Exibir badge no canto */
  showBadge?: boolean;
  /** Lista de arquivos do documento para visualização */
  files?: IdentityDocFile[];
  frontUrl?: string | null;
  backUrl?: string | null;
  fullUrl?: string | null;
  /** Habilitar abertura automática dos modais ao clicar (padrão: true) */
  enableModals?: boolean;
  /** Callback ao mudar status internamente */
  onStatusChange?: (newStatus: IdentityDocStatus, reason?: string | null) => void;
  /** Callback para envio dos arquivos ao backend */
  onSubmitToBackend?: (files: {
    front?: File | null;
    back?: File | null;
    full?: File | null;
  }) => Promise<void>;
  /** Callback geral de clique */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

function isPdfFile(url?: string, mimeType?: string): boolean {
  if (mimeType?.toLowerCase().includes("pdf")) return true;
  if (!url) return false;
  return url.toLowerCase().includes(".pdf") || url.startsWith("data:application/pdf");
}

function resolveStatusConfig(status: IdentityDocStatus): {
  category: "ok" | "analyzing" | "alert";
  labelDefault: string;
  sublabelDefault: string;
  shadowGlow: string;
  borderClass: string;
  bgGradient: string;
  iconColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeIcon: React.ComponentType<{ className?: string; size?: number }>;
  ringClass: string;
} {
  switch (status) {
    case "ok":
    case "approved":
    case "verified":
      return {
        category: "ok",
        labelDefault: "Documento Aprovado",
        sublabelDefault: "Verificado",
        shadowGlow:
          "shadow-[0_4px_20px_rgba(16,185,129,0.22)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.35)]",
        borderClass: "border-emerald-500/40 hover:border-emerald-500",
        bgGradient: "bg-emerald-50/90 text-emerald-700",
        iconColor: "text-emerald-600 drop-shadow-xs",
        badgeBg: "bg-emerald-600",
        badgeBorder: "border-white",
        badgeText: "text-white",
        badgeIcon: IconCheck,
        ringClass: "ring-2 ring-emerald-500/20",
      };

    case "analyzing":
    case "review":
    case "pending":
      return {
        category: "analyzing",
        labelDefault: "Em Análise",
        sublabelDefault: "Verificando...",
        shadowGlow:
          "shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.4)]",
        borderClass: "border-amber-500/50 hover:border-amber-500",
        bgGradient: "bg-amber-50/90 text-amber-800",
        iconColor: "text-amber-600 drop-shadow-xs",
        badgeBg: "bg-amber-500",
        badgeBorder: "border-white",
        badgeText: "text-white",
        badgeIcon: IconLoader2,
        ringClass: "ring-2 ring-amber-400/30",
      };

    case "empty":
    case "rejected":
    case "needs_action":
    default:
      return {
        category: "alert",
        labelDefault: status === "rejected" ? "Rejeitado" : "Pendente",
        sublabelDefault: status === "rejected" ? "Reenviar documento" : "Anexar documento",
        shadowGlow:
          "shadow-[0_4px_20px_rgba(239,68,68,0.22)] hover:shadow-[0_6px_25px_rgba(239,68,68,0.35)]",
        borderClass: "border-red-500/40 hover:border-red-500",
        bgGradient: "bg-red-50/90 text-red-700",
        iconColor: "text-red-600 drop-shadow-xs",
        badgeBg: "bg-red-600",
        badgeBorder: "border-white",
        badgeText: "text-white",
        badgeIcon: status === "rejected" ? IconAlertTriangle : IconId,
        ringClass: "ring-2 ring-red-500/20",
      };
  }
}

const SIZE_VARIANTS = {
  sm: {
    container: "size-10 rounded-xl",
    thumb: "w-11 h-8 rounded-lg",
    iconSize: 20,
    badgeSize: "size-4 -top-1 -right-1",
    badgeIconSize: 10,
    textWrapper: "text-xs",
  },
  md: {
    container: "size-12 rounded-2xl",
    thumb: "w-14 h-10 rounded-xl",
    iconSize: 24,
    badgeSize: "size-4.5 -top-1 -right-1",
    badgeIconSize: 11,
    textWrapper: "text-sm",
  },
  lg: {
    container: "size-16 rounded-2xl",
    thumb: "w-20 h-14 rounded-xl",
    iconSize: 32,
    badgeSize: "size-5.5 -top-1.5 -right-1.5",
    badgeIconSize: 13,
    textWrapper: "text-base",
  },
  xl: {
    container: "size-20 rounded-3xl",
    thumb: "w-24 h-16 rounded-2xl",
    iconSize: 40,
    badgeSize: "size-6.5 -top-2 -right-2",
    badgeIconSize: 15,
    textWrapper: "text-lg",
  },
};

function resolveDocumentFiles(props: IdentityDocTriggerIconProps): IdentityDocFile[] {
  if (Array.isArray(props.files) && props.files.length > 0) {
    return props.files.filter((f) => Boolean(f.url));
  }

  const resolved: IdentityDocFile[] = [];

  if (props.fullUrl) {
    resolved.push({
      url: props.fullUrl,
      label: "Documento",
      type: "full",
      title: "Documento",
    });
    return resolved;
  }

  if (props.frontUrl) {
    resolved.push({
      url: props.frontUrl,
      label: "Frente",
      type: "front",
      title: "Frente",
    });
  }

  if (props.backUrl) {
    resolved.push({
      url: props.backUrl,
      label: "Verso",
      type: "back",
      title: "Verso",
    });
  }

  return resolved;
}

/**
 * IdentityDocTriggerIcon
 *
 * Ícone e gatilho de chamada do documento de identificação.
 * O clique abre o modal correspondente ao estado:
 * - Verde (OK) ➔ Abre Modal Lightbox Ampliado
 * - Amarelo (Em Análise) ➔ Abre Modal com Animação da IA
 * - Vermelho/Vazio (Rejeitado/Pendente) ➔ Abre Modal de Captação & Validação
 */
export const IdentityDocTriggerIcon = React.forwardRef<HTMLButtonElement, IdentityDocTriggerIconProps>(
  (
    {
      status = "empty",
      role = "student",
      rejectionReason,
      size = "md",
      label,
      sublabel,
      variant = "icon-only",
      pulse = true,
      showBadge = true,
      files,
      frontUrl,
      backUrl,
      fullUrl,
      enableModals = true,
      onStatusChange,
      onSubmitToBackend,
      className,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const config = resolveStatusConfig(status);
    const sizeConfig = SIZE_VARIANTS[size];
    const BadgeIcon = config.badgeIcon;

    // Modais gerenciados internamente
    const [isAnalyzingModalOpen, setIsAnalyzingModalOpen] = React.useState(false);
    const [isCaptureModalOpen, setIsCaptureModalOpen] = React.useState(false);
    const [viewerTarget, setViewerTarget] = React.useState<{
      isOpen: boolean;
      activeIndex: number;
    }>({
      isOpen: false,
      activeIndex: 0,
    });

    const docFiles = React.useMemo(
      () => resolveDocumentFiles({ files, frontUrl, backUrl, fullUrl }),
      [files, frontUrl, backUrl, fullUrl]
    );

    const isOk = config.category === "ok";
    const isAnalyzing = config.category === "analyzing";
    const isAlert = config.category === "alert";
    const isPulsing = pulse && (isAnalyzing || isAlert);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>, targetIndex = 0) => {
      onClick?.(e);
      if (!enableModals) return;

      if (isAnalyzing) {
        setIsAnalyzingModalOpen(true);
      } else if (isAlert) {
        setIsCaptureModalOpen(true);
      } else if (isOk && docFiles.length > 0) {
        setViewerTarget({
          isOpen: true,
          activeIndex: targetIndex,
        });
      }
    };

    const displayLabel = label ?? config.labelDefault;
    const displaySublabel = sublabel ?? config.sublabelDefault;

    // Miniatura de documento para o estado verde
    const renderThumbnail = (file: IdentityDocFile, index: number, totalCount: number) => {
      const isPdf = isPdfFile(file.url, file.mimeType);

      return (
        <div
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            handleClick(e as unknown as React.MouseEvent<HTMLButtonElement>, index);
          }}
          className={cn(
            "group/thumb relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
            totalCount > 1 && "space-y-1"
          )}
        >
          <div
            className={cn(
              "relative overflow-hidden border bg-white transition-all duration-300 flex items-center justify-center shadow-xs",
              sizeConfig.thumb,
              config.borderClass,
              config.shadowGlow,
              config.ringClass,
              "hover:scale-105 active:scale-95"
            )}
            title={file.label || "Documento"}
          >
            {isPdf ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50 text-emerald-700 p-1">
                <IconFileTypePdf className="size-5" />
                <span className="text-[8px] font-bold uppercase tracking-wider">PDF</span>
              </div>
            ) : (
              <img
                src={file.url}
                alt={file.label || "Documento"}
                className="w-full h-full object-cover select-none transition-transform duration-300 group-hover/thumb:scale-110"
              />
            )}

            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
              <IconEye size={15} className="text-white drop-shadow-md" />
            </div>

            {showBadge && index === 0 && (
              <div
                className={cn(
                  "absolute flex items-center justify-center rounded-full border shadow-xs",
                  sizeConfig.badgeSize,
                  config.badgeBg,
                  config.badgeBorder,
                  config.badgeText
                )}
              >
                <IconCheck size={sizeConfig.badgeIconSize} />
              </div>
            )}
          </div>

          {totalCount > 1 && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/90 px-1.5 rounded border border-emerald-300">
              {file.label || (index === 0 ? "Frente" : "Verso")}
            </span>
          )}
        </div>
      );
    };

    let GraphicContent: React.ReactNode;

    if (isOk && docFiles.length > 0) {
      if (docFiles.length === 1) {
        GraphicContent = renderThumbnail(docFiles[0], 0, 1);
      } else {
        GraphicContent = (
          <div className="flex items-center gap-2">
            {docFiles.slice(0, 2).map((file, idx) => renderThumbnail(file, idx, 2))}
          </div>
        );
      }
    } else {
      const MainIcon =
        config.category === "ok"
          ? IconFileCheck
          : isAnalyzing
          ? IconIdBadge2
          : IconId;

      GraphicContent = (
        <div className="relative shrink-0">
          <div
            className={cn(
              "relative flex items-center justify-center border transition-all duration-300",
              sizeConfig.container,
              config.bgGradient,
              config.borderClass,
              config.shadowGlow,
              config.ringClass,
              isPulsing && "animate-pulse",
              "group-hover:scale-105 group-active:scale-95"
            )}
          >
            <MainIcon size={sizeConfig.iconSize} className={cn("transition-transform", config.iconColor)} />

            {isAnalyzing && (
              <span
                className="absolute inset-x-1.5 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-bounce opacity-90 shadow-xs"
                aria-hidden="true"
              />
            )}
          </div>

          {showBadge && (
            <div
              className={cn(
                "absolute flex items-center justify-center rounded-full border shadow-xs transition-transform group-hover:scale-110",
                sizeConfig.badgeSize,
                config.badgeBg,
                config.badgeBorder,
                config.badgeText
              )}
              title={displayLabel}
            >
              <BadgeIcon size={sizeConfig.badgeIconSize} />
            </div>
          )}
        </div>
      );
    }

    return (
      <>
        {variant === "icon-only" ? (
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            onClick={(e) => handleClick(e, 0)}
            aria-label={displayLabel}
            className={cn(
              "group relative inline-flex items-center justify-center p-1 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-50 transition-all cursor-pointer",
              className
            )}
            {...props}
          >
            {GraphicContent}
          </button>
        ) : (
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            onClick={(e) => handleClick(e, 0)}
            aria-label={displayLabel}
            className={cn(
              "group relative flex w-full items-center justify-between gap-4 p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-50",
              "bg-white border-brand-border hover:border-brand-blue/50 shadow-xs hover:shadow-md",
              className
            )}
            {...props}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {GraphicContent}
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className={cn("font-bold tracking-tight truncate block", sizeConfig.textWrapper, "text-brand-ink")}>
                  {displayLabel}
                </span>
                <p className="text-xs text-brand-muted truncate font-medium">
                  {displaySublabel}
                </p>
              </div>
            </div>

            <IconArrowRight size={18} className="text-brand-muted group-hover:text-brand-blue group-hover:translate-x-1 transition-all shrink-0" />
          </button>
        )}

        {/* 1. Modal: Em Análise */}
        {enableModals && (
          <IdentityDocAnalyzingModal
            isOpen={isAnalyzingModalOpen}
            onClose={() => setIsAnalyzingModalOpen(false)}
          />
        )}

        {/* 2. Modal: Lightbox Ampliado */}
        {enableModals && docFiles.length > 0 && (
          <IdentityDocViewerModal
            isOpen={viewerTarget.isOpen}
            onClose={() => setViewerTarget({ isOpen: false, activeIndex: 0 })}
            files={docFiles}
            initialIndex={viewerTarget.activeIndex}
          />
        )}

        {/* 3. Modal: Captação & Validação (Vazio ou Rejeitado) */}
        {enableModals && isAlert && (
          <IdentityDocCaptureModal
            isOpen={isCaptureModalOpen}
            onClose={() => setIsCaptureModalOpen(false)}
            role={role}
            status={status}
            rejectionReason={rejectionReason}
            onSubmitted={() => {
              setIsCaptureModalOpen(false);
              onStatusChange?.("analyzing", null);
            }}
            onSubmitToBackend={onSubmitToBackend}
          />
        )}
      </>
    );
  }
);

IdentityDocTriggerIcon.displayName = "IdentityDocTriggerIcon";

/* =========================================================================
 * 1. MODAL EM ANÁLISE
 * ========================================================================= */

export interface IdentityDocAnalyzingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IdentityDocAnalyzingModal({ isOpen, onClose }: IdentityDocAnalyzingModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-white border border-brand-border text-brand-ink shadow-2xl p-6 space-y-5 overflow-hidden text-center">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            Em Análise
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-brand-muted hover:text-brand-ink hover:bg-slate-100 transition cursor-pointer"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Animação do Scanner */}
        <div className="relative py-3 flex flex-col items-center justify-center">
          <div className="relative w-36 h-24 rounded-2xl bg-amber-50/70 border-2 border-amber-400 shadow-sm p-2.5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded bg-amber-200/60 flex items-center justify-center">
                <IconId size={12} className="text-amber-700" />
              </div>
              <div className="h-2 w-14 rounded bg-amber-200/50 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded bg-amber-200/40" />
              <div className="h-1.5 w-20 rounded bg-amber-200/40" />
            </div>
            <div
              className="absolute inset-x-0 h-0.5 bg-amber-500 shadow-sm animate-bounce"
              style={{ animationDuration: "1.5s" }}
            />
          </div>
        </div>

        <h3 className="text-base font-bold text-brand-ink">
          Validando seu documento…
        </h3>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-bright text-white font-bold text-xs uppercase tracking-wider shadow-sm transition cursor-pointer"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
 * 2. MODAL LIGHTBOX — ZOOM (IMAGEM OU PDF)
 * ========================================================================= */

export interface IdentityDocViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: IdentityDocFile[];
  initialIndex?: number;
}

export function IdentityDocViewerModal({
  isOpen,
  onClose,
  files,
  initialIndex = 0,
}: IdentityDocViewerModalProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  React.useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoomLevel(1);
      setRotation(0);
    }
  }, [isOpen, initialIndex]);

  if (!isOpen || files.length === 0) return null;

  const currentFile = files[currentIndex] || files[0];
  const hasMultiple = files.length > 1;
  const isPdf = isPdfFile(currentFile.url, currentFile.mimeType);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl h-[88vh] rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl flex flex-col overflow-hidden">
        {/* Top bar limpa */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {currentFile.label || "Documento"}
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              Aprovado
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasMultiple && (
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                {files.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(i);
                      setZoomLevel(1);
                      setRotation(0);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer",
                      currentIndex === i
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {f.label || (i === 0 ? "Frente" : "Verso")}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <IconX size={18} />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 min-h-[60vh] sm:min-h-[70vh] relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden p-4">
          {!isPdf && (
            <div className="absolute top-4 z-20 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-2xl backdrop-blur-md shadow-xl">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                disabled={zoomLevel <= 0.5}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
              >
                <IconZoomOut size={16} />
              </button>
              <span className="text-xs font-mono font-bold text-slate-200 px-2 min-w-10 text-center select-none">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                disabled={zoomLevel >= 3}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
              >
                <IconZoomIn size={16} />
              </button>
              <div className="w-px h-3.5 bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <IconRotate size={16} />
              </button>
            </div>
          )}

          <div className="w-full flex-1 flex items-center justify-center overflow-auto pt-8">
            {isPdf ? (
              <iframe
                src={currentFile.url}
                title="Documento PDF"
                className="w-full h-full rounded-xl border border-slate-800 shadow-2xl bg-white"
              />
            ) : (
              <img
                src={currentFile.url}
                alt={currentFile.label || "Documento"}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-out",
                  maxHeight: "68vh",
                  maxWidth: "92%",
                }}
                className="object-contain rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-slate-800 select-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * 3. MODAL DE CAPTAÇÃO & UPLOAD (VAZIO OU REJEITADO)
 * ========================================================================= */

export interface IdentityDocCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: IdentityRole;
  status?: IdentityDocStatus;
  rejectionReason?: string | null;
  onSubmitted?: () => void;
  onSubmitToBackend?: (files: {
    front?: File | null;
    back?: File | null;
    full?: File | null;
  }) => Promise<void>;
}

export function IdentityDocCaptureModal({
  isOpen,
  onClose,
  role = "student",
  status = "empty",
  rejectionReason,
  onSubmitted,
  onSubmitToBackend,
}: IdentityDocCaptureModalProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [firstSideFile, setFirstSideFile] = React.useState<File | null>(null);
  const [firstSideType, setFirstSideType] = React.useState<"front" | "back" | null>(null);
  const [secondSideFile, setSecondSideFile] = React.useState<File | null>(null);
  const [isValidatingAi, setIsValidatingAi] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentError, setCurrentError] = React.useState<string | null>(null);

  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const hasTouch = navigator.maxTouchPoints > 0 || window.innerWidth < 768;
      setIsMobile(hasTouch);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setCurrentError(null);
      setFirstSideFile(null);
      setFirstSideType(null);
      setSecondSideFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPrimary = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setIsValidatingAi(true);
    setCurrentError(null);

    const result = await fastClassifyWithAi(file, role, "any");
    setIsValidatingAi(false);

    if (result.rejectionReason) {
      setCurrentError(result.rejectionReason);
      return;
    }

    if (result.docType === "rg" && (result.sidesPresent === "front" || result.sidesPresent === "back")) {
      setFirstSideFile(file);
      setFirstSideType(result.sidesPresent);
      return;
    }

    await handleFinalSubmit({ full: file });
  };

  const handleSelectSecondary = async (files: File[]) => {
    const file = files[0];
    if (!file || !firstSideFile || !firstSideType) return;

    const needed = firstSideType === "front" ? "back" : "front";

    setIsValidatingAi(true);
    setCurrentError(null);

    const result = await fastClassifyWithAi(file, role, needed);
    setIsValidatingAi(false);

    if (result.rejectionReason) {
      setCurrentError(result.rejectionReason);
      return;
    }

    setSecondSideFile(file);
    const payload =
      firstSideType === "front"
        ? { front: firstSideFile, back: file }
        : { front: file, back: firstSideFile };

    await handleFinalSubmit(payload);
  };

  const handleFinalSubmit = async (payload: {
    front?: File | null;
    back?: File | null;
    full?: File | null;
  }) => {
    setIsSubmitting(true);
    try {
      if (onSubmitToBackend) {
        await onSubmitToBackend(payload);
      }
      onSubmitted?.();
    } catch {
      setCurrentError("Falha de conexão ao enviar o documento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPendingSecond = Boolean(firstSideFile && firstSideType && !secondSideFile);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 text-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 overflow-hidden">
        {/* Header com Fechar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {role === "student" ? "RG (Registro Geral)" : "Documento de Identificação"}
            </h3>
            <p className="text-xs text-slate-500">
              {role === "student" ? "Envie a foto do seu RG original" : "Envie seu RG ou CNH"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Motivo da Rejeição se houver */}
        {(rejectionReason || currentError) && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5 shadow-xs text-xs">
            <IconAlertTriangle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Atenção ao motivo da rejeição:</span>
              <span className="leading-relaxed font-medium block">
                {currentError || rejectionReason}
              </span>
            </div>
          </div>
        )}

        {/* Corpo de Upload */}
        {!isPendingSecond ? (
          <div>
            {isMobile ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  disabled={isValidatingAi || isSubmitting}
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-4 rounded-2xl bg-blue-50/70 hover:bg-blue-50 border border-blue-200 text-blue-900 flex flex-col items-center justify-center gap-2 shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <div className="p-2.5 rounded-full bg-blue-100 text-blue-700">
                    <IconCamera size={24} />
                  </div>
                  <span className="font-bold text-xs">Tirar foto</span>
                </button>

                <button
                  type="button"
                  disabled={isValidatingAi || isSubmitting}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 flex flex-col items-center justify-center gap-2 shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <div className="p-2.5 rounded-full bg-slate-200/70 text-slate-600">
                    <IconUpload size={24} />
                  </div>
                  <span className="font-bold text-xs">Escolher arquivo</span>
                </button>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleSelectPrimary(Array.from(e.target.files || []))}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleSelectPrimary(Array.from(e.target.files || []))}
                  className="hidden"
                />
              </div>
            ) : (
              <FileUpload
                title="Anexe seu documento"
                description="Arraste o arquivo ou clique para selecionar (PNG, JPG ou PDF)"
                accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"], "application/pdf": [".pdf"] }}
                onChange={(files: File[] | File | null) =>
                  handleSelectPrimary(Array.isArray(files) ? files : [files].filter(Boolean) as File[])
                }
              />
            )}
          </div>
        ) : (
          /* Lado faltante do RG */
          <div className="p-4 rounded-2xl bg-slate-50 border border-blue-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                <IconCheck size={16} />
                <span>{firstSideType === "front" ? "Frente do RG recebida" : "Verso do RG recebido"}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFirstSideFile(null);
                  setFirstSideType(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 transition"
              >
                Substituir
              </button>
            </div>

            <p className="text-xs font-bold text-blue-900">
              {firstSideType === "front" ? "Agora envie o VERSO do RG:" : "Agora envie a FRENTE do RG:"}
            </p>

            {isMobile ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isValidatingAi || isSubmitting}
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-3 rounded-xl bg-white border border-blue-200 text-blue-900 flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                >
                  <IconCamera size={16} className="text-blue-700" />
                  <span>Fotografar</span>
                </button>
                <button
                  type="button"
                  disabled={isValidatingAi || isSubmitting}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                >
                  <IconUpload size={16} className="text-slate-500" />
                  <span>Arquivo</span>
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleSelectSecondary(Array.from(e.target.files || []))}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleSelectSecondary(Array.from(e.target.files || []))}
                  className="hidden"
                />
              </div>
            ) : (
              <FileUpload
                title={firstSideType === "front" ? "Anexe o Verso do RG" : "Anexe a Frente do RG"}
                description="Arraste o arquivo ou clique para selecionar"
                accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"], "application/pdf": [".pdf"] }}
                onChange={(files: File[] | File | null) =>
                  handleSelectSecondary(Array.isArray(files) ? files : [files].filter(Boolean) as File[])
                }
              />
            )}
          </div>
        )}

        {/* Feedback visual de loading */}
        {isValidatingAi && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-center justify-center gap-2 shadow-xs animate-pulse">
            <IconLoader2 size={15} className="animate-spin text-amber-600" />
            <span>Conferindo nitidez e documento…</span>
          </div>
        )}

        {isSubmitting && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 flex items-center justify-center gap-2 shadow-xs animate-pulse">
            <IconLoader2 size={15} className="animate-spin text-blue-600" />
            <span>Enviando documento…</span>
          </div>
        )}
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.includes(",") ? res.split(",")[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fastClassifyWithAi(
  file: File,
  role: IdentityRole,
  expectingSide: "any" | "front" | "back" = "any"
): Promise<FastClassifyResult> {
  const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

  try {
    const base64 = await fileToBase64(file);

    const prompt = `Você é o verificador rápido de documentos oficiais do ecossistema educacional V7M.
Analise este arquivo (${isPdf ? "PDF" : "Imagem"}).
Responda ESTRITAMENTE em formato JSON com o seguinte formato:
{
  "doc_type": "rg" | "cnh" | "other",
  "is_cnh_official_pdf": boolean,
  "sides_present": "front" | "back" | "both",
  "is_legible": boolean,
  "rejection_reason": string | null
}

Regras Mandatórias:
1. Identifique se é RG ou CNH ou outro documento.
2. Se for CNH em PDF: confirme se possui a estrutura padrão gerada pelo aplicativo oficial da Carteira Digital de Trânsito (CDT/CNH Digital).
3. Se for RG: analise se a imagem contém apenas a FRENTE (com foto), apenas o VERSO (com polegar/filiação/dados) ou AMBOS no mesmo enquadramento ("both").
4. Verifique a legibilidade: se os textos e números estão legíveis e sem cortes graves.`;

    const response = await fetch("/api/ai/fast-classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "groq/qwen/qwen3.6-27b",
        file_base64: base64,
        mime_type: file.type || (isPdf ? "application/pdf" : "image/jpeg"),
        prompt,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return processAiOutput(data, role, expectingSide, isPdf);
    }
  } catch {
    // Fallback gracioso
  }

  const fileName = file.name.toLowerCase();
  if (role === "student" && fileName.includes("cnh")) {
    return {
      docType: "cnh",
      sidesPresent: "both",
      isLegible: true,
      rejectionReason:
        "A Secretaria de Educação exige que seja apresentado o RG original (a CNH não é aceita para fins de matrícula escolar).",
    };
  }

  const detectedSide = fileName.includes("verso")
    ? "back"
    : fileName.includes("frente")
    ? "front"
    : "both";

  if (expectingSide === "back" && detectedSide === "front") {
    return {
      docType: "rg",
      sidesPresent: "front",
      isLegible: true,
      rejectionReason: "Você enviou a Frente novamente. Por favor, envie o Verso do RG.",
    };
  }

  return {
    docType: fileName.includes("cnh") ? "cnh" : "rg",
    sidesPresent: detectedSide,
    isLegible: true,
    rejectionReason: null,
  };
}

function processAiOutput(
  raw: {
    doc_type?: string;
    is_cnh_official_pdf?: boolean;
    sides_present?: string;
    is_legible?: boolean;
    rejection_reason?: string | null;
  },
  role: IdentityRole,
  expectingSide: "any" | "front" | "back",
  isPdf: boolean
): FastClassifyResult {
  const docType =
    raw.doc_type === "rg" || raw.doc_type === "cnh" ? raw.doc_type : "other";
  const sidesPresent =
    raw.sides_present === "front" || raw.sides_present === "back" || raw.sides_present === "both"
      ? raw.sides_present
      : "both";
  const isLegible = raw.is_legible ?? true;

  if (!isLegible) {
    return {
      docType,
      sidesPresent,
      isLegible: false,
      rejectionReason:
        "Documento ilegível, cortado ou com reflexos. Por favor, envie uma foto nítida e bem iluminada.",
    };
  }

  if (role === "student" && docType === "cnh") {
    return {
      docType: "cnh",
      sidesPresent,
      isLegible: true,
      rejectionReason:
        "A Secretaria de Educação exige que seja apresentado o RG original (a CNH não é aceita para fins de matrícula escolar).",
    };
  }

  if (role === "promoter" && docType === "cnh" && isPdf && !raw.is_cnh_official_pdf) {
    return {
      docType: "cnh",
      sidesPresent,
      isLegible: true,
      rejectionReason:
        "O PDF da CNH deve ser extraído diretamente do aplicativo oficial da CNH Digital (Carteira Digital de Trânsito).",
    };
  }

  if (docType === "rg" && expectingSide !== "any") {
    if (expectingSide === "back" && sidesPresent === "front") {
      return {
        docType: "rg",
        sidesPresent: "front",
        isLegible: true,
        rejectionReason: "Você enviou a Frente novamente. Por favor, envie o Verso do RG.",
      };
    }
    if (expectingSide === "front" && sidesPresent === "back") {
      return {
        docType: "rg",
        sidesPresent: "back",
        isLegible: true,
        rejectionReason: "Você enviou o Verso novamente. Por favor, envie a Frente do RG.",
      };
    }
  }

  return {
    docType,
    isOfficialCnhPdf: raw.is_cnh_official_pdf ?? true,
    sidesPresent,
    isLegible: true,
    rejectionReason: null,
  };
}
