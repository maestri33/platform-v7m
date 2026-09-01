"use client";

import * as React from "react";
import {
  Camera,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Sparkles,
  ShieldCheck,
  Image as ImageIcon,
  Layers,
  ArrowRight,
} from "lucide-react";

export type IdentityDocType = "rg" | "cnh";
export type IdentityUploadMode = "sides" | "full";
export type IdentitySlot = "rg_front" | "rg_back" | "rg_full" | "cnh_full";

export interface IdentityClassification {
  is_document?: boolean | null;
  doc_type?: string | null;
  completeness?: "front" | "back" | "full" | null;
  is_legible?: boolean | null;
  reason?: string | null;
  confidence?: number | null;
}

export interface IdentityDocumentCaptureProps {
  /** Supported document types. Defaults to ["rg", "cnh"] */
  allowedTypes?: IdentityDocType[];
  /** Currently selected document type */
  docType?: IdentityDocType;
  /** Callback when user changes document type */
  onDocTypeChange?: (type: IdentityDocType) => void;

  /** Upload mode: "sides" (front then back) or "full" (both in one image/PDF) */
  mode?: IdentityUploadMode;
  /** Callback when user switches upload mode */
  onModeChange?: (mode: IdentityUploadMode) => void;
  /** Whether the user can change mode (disabled after front is already submitted) */
  canChangeMode?: boolean;

  /** Current required slot */
  slot?: IdentitySlot;
  /** Whether the front side of RG has already been successfully sent */
  hasFrontSent?: boolean;
  /** Preview URL of the previously sent front photo */
  frontPhotoUrl?: string | null;

  /** Currently selected file (controlled or uncontrolled) */
  file?: File | null;
  /** Callback when a file is picked, compressed or removed */
  onFileChange?: (file: File | null) => void;

  /** Optional callback to run fast AI classification on the file */
  onClassify?: (file: File) => Promise<IdentityClassification>;
  /** Optional current classification result */
  classification?: IdentityClassification | null;
  /** Whether classification is currently running */
  isClassifying?: boolean;

  /** Callback when user clicks to submit the current file */
  onSubmit?: (file: File, mode: IdentityUploadMode, slot: IdentitySlot) => Promise<void> | void;
  /** Whether the submit action is loading */
  isSubmitting?: boolean;

  /** Custom external error message */
  error?: string | null;
  /** Callback to clear error */
  onClearError?: () => void;

  /** Custom success notice message */
  notice?: string | null;

  /** Whether to render the primary action submit button inside the component */
  showSubmitButton?: boolean;
  /** Label for the submit button */
  submitButtonLabel?: string;

  /** Disabled state */
  disabled?: boolean;
  /** Custom root className */
  className?: string;
}

/** Formata bytes em KB ou MB legível */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Comprime imagem client-side mantendo resolução ideal para OCR */
async function compressDocImage(file: File, maxDim = 1800, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || typeof window === "undefined") {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const { width: w, height: h } = bitmap;
    if (w <= maxDim && h <= maxDim && file.size < 700 * 1024) {
      bitmap.close();
      return file;
    }
    let targetW = w;
    let targetH = h;
    if (w > maxDim || h > maxDim) {
      if (w >= h) {
        targetW = maxDim;
        targetH = Math.round((h * maxDim) / w);
      } else {
        targetH = maxDim;
        targetW = Math.round((w * maxDim) / h);
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;
    const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function IdentityDocumentCapture({
  allowedTypes = ["rg", "cnh"],
  docType: controlledDocType,
  onDocTypeChange,
  mode: controlledMode,
  onModeChange,
  canChangeMode = true,
  slot: controlledSlot,
  hasFrontSent = false,
  frontPhotoUrl,
  file: controlledFile,
  onFileChange,
  onClassify,
  classification: controlledClassification,
  isClassifying: controlledIsClassifying,
  onSubmit,
  isSubmitting = false,
  error: externalError,
  onClearError,
  notice,
  showSubmitButton = true,
  submitButtonLabel,
  disabled = false,
  className = "",
}: IdentityDocumentCaptureProps) {
  // Uncontrolled fallback state
  const [internalDocType, setInternalDocType] = React.useState<IdentityDocType>("rg");
  const docType = controlledDocType ?? internalDocType;

  const [internalMode, setInternalMode] = React.useState<IdentityUploadMode>("sides");
  const mode = controlledMode ?? internalMode;

  const [internalFile, setInternalFile] = React.useState<File | null>(null);
  const file = controlledFile !== undefined ? controlledFile : internalFile;

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const [internalClassification, setInternalClassification] =
    React.useState<IdentityClassification | null>(null);
  const classification = controlledClassification ?? internalClassification;

  const [internalIsClassifying, setInternalIsClassifying] = React.useState(false);
  const isClassifying = controlledIsClassifying ?? internalIsClassifying;

  const [localError, setLocalError] = React.useState<string | null>(null);
  const error = externalError ?? localError;

  const [allowBypassWarning, setAllowBypassWarning] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  // Sync preview URL when file changes
  React.useEffect(() => {
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  // Determine current active slot
  const currentSlot: IdentitySlot =
    controlledSlot ??
    (docType === "cnh"
      ? "cnh_full"
      : mode === "full"
        ? "rg_full"
        : hasFrontSent
          ? "rg_back"
          : "rg_front");

  const isBackSlot = docType === "rg" && mode === "sides" && (currentSlot === "rg_back" || hasFrontSent);

  // Labels and instructions
  const slotTitle =
    docType === "cnh"
      ? "CNH Aberta ou PDF Digital"
      : mode === "full"
        ? "RG Completo (Frente e Verso)"
        : isBackSlot
          ? "Verso do RG"
          : "Frente do RG";

  const slotInstruction =
    docType === "cnh"
      ? "Envie uma foto nítida da sua CNH aberta ou o PDF original exportado da CNH Digital."
      : mode === "full"
        ? "Envie os dois lados juntos no mesmo arquivo (foto aberta, folha A4 ou PDF oficial)."
        : isBackSlot
          ? "Agora envie o verso do seu RG (onde constam os dados, filiação, CPF e data de nascimento)."
          : "Envie a frente do seu RG (onde fica a foto do seu rosto e a impressão digital).";

  // Document Type Change Handler
  const handleSelectDocType = (type: IdentityDocType) => {
    if (disabled || isSubmitting || hasFrontSent) return;
    if (onDocTypeChange) onDocTypeChange(type);
    else setInternalDocType(type);

    handleClearFile();
  };

  // Upload Mode Change Handler
  const handleSelectMode = (newMode: IdentityUploadMode) => {
    if (disabled || isSubmitting || !canChangeMode || hasFrontSent) return;
    if (onModeChange) onModeChange(newMode);
    else setInternalMode(newMode);

    handleClearFile();
  };

  // Clear File Handler
  const handleClearFile = () => {
    if (onFileChange) onFileChange(null);
    else setInternalFile(null);

    setInternalClassification(null);
    setLocalError(null);
    setAllowBypassWarning(false);
    if (onClearError) onClearError();

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Process File Selection
  const handleProcessFile = async (rawFile: File) => {
    setLocalError(null);
    setAllowBypassWarning(false);
    if (onClearError) onClearError();

    if (!rawFile.type.startsWith("image/") && rawFile.type !== "application/pdf") {
      setLocalError("Formato não suportado. Por favor, envie uma foto em JPG/PNG ou documento em PDF.");
      return;
    }

    if (rawFile.size > 20 * 1024 * 1024) {
      setLocalError("O arquivo enviado é muito grande (limite de 20 MB).");
      return;
    }

    // Compress images
    const processedFile = await compressDocImage(rawFile);

    if (onFileChange) onFileChange(processedFile);
    else setInternalFile(processedFile);

    // Fast AI classification
    if (onClassify) {
      setInternalIsClassifying(true);
      try {
        const result = await onClassify(processedFile);
        setInternalClassification(result);
      } catch {
        // Fail-open: Não bloqueia caso a classificação rápida falhe
        setInternalClassification(null);
      } finally {
        setInternalIsClassifying(false);
      }
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isSubmitting) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isSubmitting) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await handleProcessFile(droppedFile);
    }
  };

  // Evaluate AI Classification Warnings
  let warningMessage: string | null = null;
  let isStrictBlocking = false;

  if (classification) {
    if (classification.is_document === false) {
      warningMessage = "A foto não parece ser um documento oficial. Verifique se enquadrou corretamente.";
    } else if (docType === "rg") {
      if (classification.doc_type === "cnh") {
        warningMessage = "Essa foto parece ser uma CNH. Para este passo, selecione CNH no topo ou envie o RG.";
      } else if (mode === "sides") {
        const expected = isBackSlot ? "back" : "front";
        if (classification.completeness && classification.completeness !== expected && classification.completeness !== "full") {
          const detected = classification.completeness === "front" ? "Frente" : "Verso";
          const needed = expected === "front" ? "a Frente" : "o Verso";
          warningMessage = `Detectamos que esta foto é a ${detected} do documento. Por favor, envie ${needed}.`;
        }
      }
    } else if (docType === "cnh" && classification.doc_type === "rg") {
      warningMessage = "Essa foto parece ser um RG. Para este passo, envie sua CNH ou selecione RG no topo.";
    }
  }

  const handleTriggerSubmit = () => {
    if (!file || isSubmitting || disabled) return;
    if (onSubmit) {
      onSubmit(file, mode, currentSlot);
    }
  };

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* 1. SELETOR DE TIPO DE DOCUMENTO (se mais de 1 permitido) */}
      {allowedTypes.length > 1 && !hasFrontSent && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-extrabold uppercase tracking-wider text-brand-muted">
            Tipo de Documento
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {allowedTypes.map((type) => {
              const active = docType === type;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled || isSubmitting}
                  onClick={() => handleSelectDocType(type)}
                  className={`flex items-center justify-center gap-2.5 rounded-xl border p-3 text-sm font-bold transition-all duration-200 ${
                    active
                      ? "border-brand-blue bg-brand-blue/10 text-brand-blue ring-2 ring-brand-blue/20 shadow-sm"
                      : "border-brand-border bg-white text-brand-ink hover:border-brand-blue/40 hover:bg-brand-bg/50"
                  }`}
                >
                  <ShieldCheck className={`size-4 ${active ? "text-brand-blue" : "text-brand-muted"}`} />
                  <span>{type === "rg" ? "RG (Identidade)" : "CNH (Habilitação)"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. SELETOR DE MODO DE ENVIO (Apenas para RG e antes de iniciar) */}
      {docType === "rg" && canChangeMode && !hasFrontSent && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-muted">
              Modo de Envio
            </label>
            <span className="text-[11px] font-medium text-brand-muted">
              {mode === "sides" ? "Frente e Verso separados" : "Arquivo único com 2 lados"}
            </span>
          </div>
          <div className="flex rounded-xl bg-brand-bg p-1 border border-brand-border/60">
            {(
              [
                ["sides", "Frente e Verso separados"],
                ["full", "Arquivo Único / PDF"],
              ] as const
            ).map(([m, label]) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled || isSubmitting}
                  onClick={() => handleSelectMode(m)}
                  className={`flex-1 rounded-lg py-2 px-3 text-xs font-bold transition-all duration-200 ${
                    active
                      ? "bg-white text-brand-ink shadow-sm ring-1 ring-black/5"
                      : "text-brand-muted hover:text-brand-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. PROGRESSO DOS SLOTS (Quando em modo Frente e Verso) */}
      {docType === "rg" && mode === "sides" && (
        <div className="grid grid-cols-2 gap-3">
          {/* Card Frente */}
          <div
            className={`flex items-center gap-2.5 rounded-xl border p-3 transition-all ${
              hasFrontSent
                ? "border-brand-green/40 bg-brand-green-bg/50 text-brand-green-dark"
                : !isBackSlot
                  ? "border-brand-blue bg-brand-blue/5 text-brand-blue ring-1 ring-brand-blue/30"
                  : "border-brand-border bg-brand-bg/40 text-brand-muted opacity-60"
            }`}
          >
            {hasFrontSent ? (
              <CheckCircle2 className="size-4 shrink-0 text-brand-green" />
            ) : (
              <span className="flex size-4 items-center justify-center rounded-full bg-brand-blue text-[10px] font-bold text-white">
                1
              </span>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-tight">1. Frente</span>
              <span className="text-[11px] font-medium leading-none opacity-80">
                {hasFrontSent ? "Recebida ✓" : "Etapa Atual"}
              </span>
            </div>
          </div>

          {/* Card Verso */}
          <div
            className={`flex items-center gap-2.5 rounded-xl border p-3 transition-all ${
              isBackSlot
                ? "border-brand-blue bg-brand-blue/5 text-brand-blue ring-1 ring-brand-blue/30 shadow-sm"
                : "border-brand-border bg-brand-bg/40 text-brand-muted opacity-60"
            }`}
          >
            <span
              className={`flex size-4 items-center justify-center rounded-full text-[10px] font-bold ${
                isBackSlot ? "bg-brand-blue text-white" : "bg-brand-border text-brand-muted"
              }`}
            >
              2
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-tight">2. Verso</span>
              <span className="text-[11px] font-medium leading-none opacity-80">
                {isBackSlot ? "Aguardando envio" : "Próxima etapa"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. ÁREA DE CAPTURA / DROPZONE & PREVIEW */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-extrabold text-brand-ink flex items-center gap-1.5">
            <FileText className="size-4 text-brand-blue" />
            {slotTitle}
          </h3>
          {file && (
            <span className="text-xs font-semibold text-brand-muted">
              {formatFileSize(file.size)}
            </span>
          )}
        </div>

        <p className="text-xs leading-relaxed text-brand-muted">
          {slotInstruction}
        </p>

        {/* Hidden Native File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          disabled={disabled || isSubmitting}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleProcessFile(f);
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={disabled || isSubmitting}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleProcessFile(f);
          }}
        />

        {/* DROPZONE / FILE PREVIEW CARD */}
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`group relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
              isDragging
                ? "border-brand-blue bg-brand-blue-bg/70 ring-4 ring-brand-blue/10 scale-[1.01]"
                : "border-brand-border bg-white hover:border-brand-blue/60 hover:bg-slate-50/70"
            }`}
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-bg text-brand-blue group-hover:scale-110 group-hover:bg-brand-blue/10 transition-transform duration-200">
              <Camera className="size-7" />
            </div>

            <div className="flex flex-col gap-1 max-w-xs">
              <span className="text-sm font-extrabold text-brand-ink">
                Tire uma foto ou escolha do aparelho
              </span>
              <span className="text-xs text-brand-muted">
                Formatos aceitos: JPG, PNG ou PDF até 20 MB.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs pt-1">
              <button
                type="button"
                disabled={disabled || isSubmitting}
                onClick={() => cameraInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-brand-blue-bright active:scale-95 transition-all duration-150"
              >
                <Camera className="size-4" />
                Tirar Foto Agora
              </button>
              <button
                type="button"
                disabled={disabled || isSubmitting}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2.5 text-xs font-extrabold text-brand-ink hover:bg-brand-bg hover:border-brand-ink/20 active:scale-95 transition-all duration-150"
              >
                <Upload className="size-4 text-brand-muted" />
                Abrir Arquivo
              </button>
            </div>
          </div>
        ) : (
          /* FILE PREVIEW CONTAINER */
          <div className="relative overflow-hidden rounded-2xl border border-brand-border bg-white p-4 shadow-sm transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {previewUrl ? (
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-brand-border bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Pré-visualização do documento"
                      className="size-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-200">
                    <FileText className="size-8" />
                  </div>
                )}

                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm font-bold text-brand-ink">
                    {file.name}
                  </span>
                  <span className="text-xs font-semibold text-brand-muted">
                    {formatFileSize(file.size)} • {file.type.includes("pdf") ? "Documento PDF" : "Imagem"}
                  </span>
                  <div className="flex items-center gap-1.5 pt-1 text-[11px] font-bold text-brand-green">
                    <CheckCircle2 className="size-3.5" />
                    Arquivo pronto para envio
                  </div>
                </div>
              </div>

              {/* Botões de Ação no Arquivo */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  title="Trocar arquivo"
                  disabled={disabled || isSubmitting}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg p-2 text-brand-muted hover:bg-brand-bg hover:text-brand-ink transition-colors"
                >
                  <RefreshCw className="size-4" />
                </button>
                <button
                  type="button"
                  title="Remover arquivo"
                  disabled={disabled || isSubmitting}
                  onClick={handleClearFile}
                  className="rounded-lg p-2 text-brand-muted hover:bg-brand-danger-bg hover:text-brand-danger transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. SHIMMER & STATUS DA IA */}
      {isClassifying && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-blue/30 bg-brand-blue-bg/40 px-4 py-3 text-xs font-bold text-brand-blue animate-pulse">
          <Sparkles className="size-4 animate-spin" />
          <span>Nossa IA está verificando o enquadramento e legibilidade do documento…</span>
        </div>
      )}

      {/* 6. AVISOS & WARNINGS DA IA */}
      {warningMessage && !allowBypassWarning && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-amber-950">Atenção ao documento</span>
              <p className="leading-relaxed">{warningMessage}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60 mt-1">
            <button
              type="button"
              onClick={handleClearFile}
              className="rounded-lg px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-100 transition-colors"
            >
              Trocar Foto
            </button>
            <button
              type="button"
              onClick={() => setAllowBypassWarning(true)}
              className="rounded-lg bg-amber-200 px-3 py-1.5 font-bold text-amber-950 hover:bg-amber-300 transition-colors"
            >
              Enviar Assim Mesmo
            </button>
          </div>
        </div>
      )}

      {/* 7. MENSAGEM DE SUCESSO / AVISO */}
      {notice && (
        <div className="flex items-center gap-2.5 rounded-xl bg-brand-green-bg px-4 py-3 text-xs font-bold text-brand-green-dark border border-brand-green/20">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* 8. ERROS */}
      {error && (
        <div className="flex items-start justify-between gap-2.5 rounded-xl bg-brand-danger-bg px-4 py-3 text-xs font-bold text-brand-danger border border-brand-danger/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              className="rounded-md p-0.5 hover:bg-brand-danger/10 text-brand-danger"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 9. BOTÃO DE ENVIO EMBUTIDO (OPCIONAL) */}
      {showSubmitButton && file && (
        <button
          type="button"
          disabled={disabled || isSubmitting || isClassifying}
          onClick={handleTriggerSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3.5 px-5 text-sm font-extrabold text-white shadow-md hover:bg-brand-blue-bright disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all duration-150"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="size-4 animate-spin" />
              <span>Enviando documento…</span>
            </>
          ) : (
            <>
              <span>{submitButtonLabel || (isBackSlot ? "Concluir Envio do RG" : "Continuar")}</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
