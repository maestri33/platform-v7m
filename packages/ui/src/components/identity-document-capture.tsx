"use client";

import * as React from "react";
import {
  Camera,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export type IdentityDocType = "rg" | "cnh";
export type IdentityUploadMode = "sides" | "full";
export type IdentitySlot = "rg_front" | "rg_back" | "rg_full" | "cnh_full" | "front" | "back" | "full";

export interface IdentityClassification {
  is_document?: boolean | null;
  doc_type?: string | null;
  completeness?: "front" | "back" | "full" | null;
  is_legible?: boolean | null;
  reason?: string | null;
  confidence?: number | null;
}

export interface IdentityDocumentCaptureProps {
  /** Se permite envio de CNH além de RG. Padrão: false */
  allowCnh?: boolean;
  /** Tipos de documentos permitidos (ex: ['rg', 'cnh']) */
  allowedTypes?: IdentityDocType[];
  /** Tipo de documento ativo ('rg' | 'cnh'). Padrão: 'rg' */
  docType?: IdentityDocType;
  /** Callback quando o tipo de documento muda */
  onDocTypeChange?: (type: IdentityDocType) => void;

  /** Modo de envio atual ('sides' | 'full') */
  mode?: IdentityUploadMode;
  /** Callback quando o modo de envio muda */
  onModeChange?: (mode: IdentityUploadMode) => void;
  /** Permite alterar modo manualmente */
  canChangeMode?: boolean;

  /** Slot atual exigido */
  slot?: IdentitySlot | string;
  /** Se a frente já foi enviada com sucesso */
  hasFrontSent?: boolean;
  /** Se o verso já foi enviado com sucesso */
  hasBackSent?: boolean;
  /** URL de preview da frente já enviada */
  frontPhotoUrl?: string | null;

  /** Arquivo selecionado */
  file?: File | null;
  /** Callback quando o arquivo muda */
  onFileChange?: (file: File | null) => void;

  /** Callback para classificação inteligente de IA */
  onClassify?: (file: File) => Promise<IdentityClassification>;
  /** Resultado da classificação atual */
  classification?: IdentityClassification | null;
  /** Se a IA está classificando */
  isClassifying?: boolean;

  /** Callback de envio */
  onSubmit?: (file: File, mode: IdentityUploadMode, slot: IdentitySlot) => Promise<void> | void;
  /** Callback quando todo o documento é concluído */
  onComplete?: () => void;
  /** Se está submetendo */
  isSubmitting?: boolean;

  /** Erro externo */
  error?: string | null;
  /** Limpar erro */
  onClearError?: () => void;

  /** Aviso de sucesso */
  notice?: string | null;

  /** Exibir botão de envio dentro do componente */
  showSubmitButton?: boolean;
  /** Rótulo do botão de envio */
  submitButtonLabel?: string;

  /**
   * Variante visual do container:
   * - 'embedded': Sem moldura/borda redundante nem padding extra, perfeito para uso dentro de <Card> (padrão quando embutido no funil).
   * - 'card': Com moldura elevada, fundo branco/blur e sombra para uso como card independente.
   * Padrão: 'embedded'
   */
  variant?: "embedded" | "card";

  /** Desabilitado */
  disabled?: boolean;
  /** Classe CSS */
  className?: string;
}

/** Formata bytes para exibição legível */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Comprime imagem client-side */
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

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export function IdentityDocumentCapture({
  allowCnh = false,
  docType = "rg",
  mode: propMode = "sides",
  onModeChange,
  slot: propSlot = "rg_front",
  hasFrontSent = false,
  hasBackSent = false,
  file: controlledFile,
  onFileChange,
  onClassify,
  onSubmit,
  onComplete,
  isSubmitting = false,
  error: externalError,
  onClearError,
  notice: externalNotice,
  showSubmitButton = false,
  submitButtonLabel,
  variant = "embedded",
  disabled = false,
  className = "",
}: IdentityDocumentCaptureProps) {
  const [internalFile, setInternalFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [internalClassifying, setInternalClassifying] = React.useState(false);
  const [internalError, setInternalError] = React.useState<string | null>(null);
  const [localClassification, setLocalClassification] = React.useState<IdentityClassification | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  // Rastreamento inteligente de lados capturados
  const [frontSaved, setFrontSaved] = React.useState<boolean>(hasFrontSent);
  const [backSaved, setBackSaved] = React.useState<boolean>(hasBackSent);
  const [activeSide, setActiveSide] = React.useState<"front" | "back" | "full">(
    hasFrontSent && !hasBackSent ? "back" : "front"
  );

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const currentFile = controlledFile !== undefined ? controlledFile : internalFile;
  const activeError = externalError || internalError;

  // Detecção inteligente e segura de plataforma (mobile vs desktop)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const updateDevice = () => {
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isMobileUa = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile((hasTouch && isMobileUa) || isSmallScreen);
    };
    updateDevice();
    window.addEventListener("resize", updateDevice);
    return () => window.removeEventListener("resize", updateDevice);
  }, []);

  // Atualiza estado ao mudar props externas
  React.useEffect(() => {
    setFrontSaved(Boolean(hasFrontSent));
    setBackSaved(Boolean(hasBackSent));
    if (hasFrontSent && !hasBackSent) setActiveSide("back");
    if (hasBackSent && !hasFrontSent) setActiveSide("front");
  }, [hasFrontSent, hasBackSent]);

  // Atualiza preview de imagem
  React.useEffect(() => {
    if (!currentFile) {
      setPreviewUrl(null);
      return;
    }
    if (currentFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(currentFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [currentFile]);

  const updateFile = (newFile: File | null) => {
    if (controlledFile === undefined) {
      setInternalFile(newFile);
    }
    onFileChange?.(newFile);
  };

  /** Processa arquivo selecionado e roda IA de validação com fluxo automático */
  const processAndValidateFile = async (rawFile: File) => {
    setInternalError(null);
    onClearError?.();
    setLocalClassification(null);

    // Validações básicas de formato e tamanho
    const isValidFormat =
      rawFile.type.startsWith("image/") || rawFile.type === "application/pdf";
    if (!isValidFormat) {
      setInternalError("Formato não suportado. Por favor, envie uma foto (JPG, PNG) ou documento em PDF.");
      return;
    }

    if (rawFile.size > 25 * 1024 * 1024) {
      setInternalError("O arquivo é muito grande. O tamanho máximo permitido é 25 MB.");
      return;
    }

    if (rawFile.size === 0) {
      setInternalError("O arquivo selecionado está vazio (0 bytes). Por favor, selecione outro.");
      return;
    }

    // Comprime se for imagem
    const compressed = await compressDocImage(rawFile);
    updateFile(compressed);

    // Executa análise de IA
    if (onClassify) {
      setInternalClassifying(true);
      try {
        const result = await onClassify(compressed);
        setLocalClassification(result);

        // 1. Verifica se é documento
        if (result.is_document === false) {
          setInternalError("A imagem enviada não parece ser um documento oficial. Por favor, tire uma foto nítida do seu RG.");
          setInternalClassifying(false);
          return;
        }

        // 2. Verifica legibilidade
        if (result.is_legible === false) {
          setInternalError("A foto está ilegível, cortada ou com muito reflexo. Por favor, envie uma foto mais nítida.");
          setInternalClassifying(false);
          return;
        }

        // 3. Verifica tipo de documento (RG vs CNH)
        if (result.doc_type === "cnh" && !allowCnh) {
          setInternalError("No momento aceitamos apenas RG. Por favor, envie o seu RG.");
          setInternalClassifying(false);
          return;
        }

        if (result.doc_type === "address_proof") {
          setInternalError("Este arquivo parece ser um comprovante de endereço. Por favor, envie a foto do seu RG.");
          setInternalClassifying(false);
          return;
        }

        // 4. Fluxo Inteligente de Completeness (Lado do Documento)
        const completeness = result.completeness;

        if (completeness === "full") {
          // Documento completo (RG aberto com frente e verso ou PDF)
          onModeChange?.("full");
          if (onSubmit) {
            await onSubmit(compressed, "full", "full");
          }
          onComplete?.();
          return;
        }

        if (completeness === "front") {
          if (backSaved) {
            // Já tínhamos o verso, agora veio a frente -> Conclui e avança na hora!
            setFrontSaved(true);
            if (onSubmit) {
              await onSubmit(compressed, "sides", "front");
            }
            onComplete?.();
          } else {
            // Veio a frente, salva e pede o verso suavemente
            setFrontSaved(true);
            setActiveSide("back");
            if (onSubmit) {
              await onSubmit(compressed, "sides", "front");
            }
            updateFile(null);
          }
          return;
        }

        if (completeness === "back") {
          if (frontSaved) {
            // Já tínhamos a frente, agora veio o verso -> Conclui e avança na hora!
            setBackSaved(true);
            if (onSubmit) {
              await onSubmit(compressed, "sides", "back");
            }
            onComplete?.();
          } else {
            // Veio o verso, salva e pede a frente
            setBackSaved(true);
            setActiveSide("front");
            if (onSubmit) {
              await onSubmit(compressed, "sides", "back");
            }
            updateFile(null);
          }
          return;
        }

        // Se a IA não identificou com certeza o lado, avança automaticamente com o slot ativo
        if (onSubmit && !showSubmitButton) {
          const currentMode = propMode;
          const slotToSend = activeSide === "back" ? "back" : "front";
          await onSubmit(compressed, currentMode, slotToSend as IdentitySlot);
        }
      } catch (err: unknown) {
        console.warn("Classificação prévia falhou, prosseguindo com envio:", err);
        if (onSubmit && !showSubmitButton) {
          const currentMode = propMode;
          const slotToSend = activeSide === "back" ? "back" : "front";
          await onSubmit(compressed, currentMode, slotToSend as IdentitySlot);
        }
      } finally {
        setInternalClassifying(false);
      }
    } else if (onSubmit && !showSubmitButton) {
      // Sem classificador local, envia direto
      const currentMode = propMode;
      const slotToSend = activeSide === "back" ? "back" : "front";
      await onSubmit(compressed, currentMode, slotToSend as IdentitySlot);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processAndValidateFile(f);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) processAndValidateFile(f);
  };

  const triggerCamera = () => {
    if (disabled) return;
    cameraInputRef.current?.click();
  };

  const triggerFilePicker = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    updateFile(null);
    setLocalClassification(null);
    setInternalError(null);
    onClearError?.();
  };

  // Título e orientações minimalistas baseados no estado
  const docLabel = docType === "cnh" ? "CNH" : "RG";
  let promptTitle = `Envie a Frente do ${docLabel}`;
  let promptSubtitle = "Fotografe o lado que contém sua foto, assinatura e polegar.";

  if (propMode === "full") {
    promptTitle = `Envie seu ${docLabel} aberto`;
    promptSubtitle = "Envie o documento aberto ou arquivo PDF contendo frente e verso juntos.";
  } else if (frontSaved && !backSaved) {
    promptTitle = `Agora envie o Verso do ${docLabel}`;
    promptSubtitle = "Fotografe o lado com o número do RG, CPF, filiação e data de nascimento.";
  } else if (backSaved && !frontSaved) {
    promptTitle = `Agora envie a Frente do ${docLabel}`;
    promptSubtitle = "Fotografe o lado que contém sua foto, assinatura e polegar.";
  } else if (activeSide === "back") {
    promptTitle = `Envie o Verso do ${docLabel}`;
    promptSubtitle = "Fotografe o lado com o número do RG, CPF, filiação e data de nascimento.";
  }

  const isBusy = internalClassifying || isSubmitting;

  return (
    <div className={`w-full ${className}`}>
      {/* Inputs ocultos para Câmera e Arquivo */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled || isBusy}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled || isBusy}
      />

      {/* Container Adaptável: 'card' (independente) ou 'embedded' (dentro de <Card>) */}
      <div
        className={
          variant === "card"
            ? `relative overflow-hidden rounded-2xl border bg-white/95 p-5 shadow-sm backdrop-blur-md transition-all sm:p-6 ${
                isDragOver
                  ? "border-brand-blue-bright bg-brand-blue-bg/40 ring-2 ring-brand-blue-bright/20"
                  : "border-brand-border"
              } ${disabled ? "opacity-60" : ""}`
            : `relative w-full transition-all ${disabled ? "opacity-60" : ""}`
        }
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {/* DualSideTracker: Indicador de Duas Etapas para Documento em 2 Lados */}
        {propMode === "sides" && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-brand-border bg-brand-bg/80 p-1.5">
            <div
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                frontSaved
                  ? "border border-brand-green/30 bg-brand-green-bg text-brand-green-dark"
                  : activeSide === "front"
                    ? "border border-brand-blue/30 bg-brand-blue-bg text-brand-blue shadow-xs"
                    : "text-brand-muted"
              }`}
            >
              {frontSaved ? (
                <>
                  <CheckCircle2 className="size-3.5 shrink-0 text-brand-green-dark" />
                  <span className="truncate">1. Frente Recebida</span>
                </>
              ) : (
                <>
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-[10px] font-extrabold text-brand-blue">
                    1
                  </span>
                  <span className="truncate">Frente do {docLabel}</span>
                </>
              )}
            </div>

            <ArrowRight className="size-3 shrink-0 text-brand-muted/40" />

            <div
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                backSaved
                  ? "border border-brand-green/30 bg-brand-green-bg text-brand-green-dark"
                  : activeSide === "back"
                    ? "border border-brand-blue/30 bg-brand-blue-bg text-brand-blue shadow-xs"
                    : "text-brand-muted"
              }`}
            >
              {backSaved ? (
                <>
                  <CheckCircle2 className="size-3.5 shrink-0 text-brand-green-dark" />
                  <span className="truncate">2. Verso Recebido</span>
                </>
              ) : (
                <>
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-[10px] font-extrabold text-brand-blue">
                    2
                  </span>
                  <span className="truncate">Verso do {docLabel}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mini-preview do lado já salvo com ação de troca */}
        {frontSaved && !backSaved && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-brand-green/30 bg-brand-green-bg/40 p-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-green-bg text-brand-green-dark">
                <CheckCircle2 className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-brand-ink">
                  Frente do documento pronta
                </p>
                <p className="text-[11px] font-medium text-brand-green-dark">
                  Aguardando o verso para avançar
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFrontSaved(false);
                setActiveSide("front");
                updateFile(null);
              }}
              className="px-2 py-1 text-xs font-bold text-brand-muted transition hover:text-brand-danger"
              disabled={isBusy}
            >
              Trocar
            </button>
          </div>
        )}

        {backSaved && !frontSaved && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-brand-green/30 bg-brand-green-bg/40 p-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-green-bg text-brand-green-dark">
                <CheckCircle2 className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-brand-ink">
                  Verso do documento pronto
                </p>
                <p className="text-[11px] font-medium text-brand-green-dark">
                  Aguardando a frente para avançar
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setBackSaved(false);
                setActiveSide("back");
                updateFile(null);
              }}
              className="px-2 py-1 text-xs font-bold text-brand-muted transition hover:text-brand-danger"
              disabled={isBusy}
            >
              Trocar
            </button>
          </div>
        )}

        {/* Cabeçalho Minimalista */}
        <div className="mb-5 flex flex-col gap-1 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <h3 className="text-lg font-extrabold text-brand-ink sm:text-xl">
              {promptTitle}
            </h3>
          </div>
          <p className="text-sm font-medium text-brand-muted">{promptSubtitle}</p>
        </div>

        {/* Alerta de Erro */}
        {activeError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-brand-danger/30 bg-brand-danger-bg p-3.5 text-xs font-bold text-brand-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-brand-danger" />
            <div className="flex-1">
              <p className="leading-relaxed">{activeError}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setInternalError(null);
                onClearError?.();
              }}
              className="text-brand-danger hover:opacity-80"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Aviso de Sucesso */}
        {externalNotice && !activeError && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-brand-green/30 bg-brand-green-bg p-3.5 text-xs font-bold text-brand-green-dark">
            <CheckCircle2 className="size-4 shrink-0 text-brand-green-dark" />
            <span>{externalNotice}</span>
          </div>
        )}

        {/* Estado 1: Analisando IA */}
        {internalClassifying && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="relative flex size-12 items-center justify-center rounded-full bg-brand-blue-bg text-brand-blue">
              <RefreshCw className="size-6 animate-spin text-brand-blue" />
              <Sparkles className="absolute -right-1 -top-1 size-4 text-brand-yellow animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-ink">
                Analisando documento...
              </p>
              <p className="text-xs font-medium text-brand-muted">
                Verificando legibilidade e formato
              </p>
            </div>
          </div>
        )}

        {/* Estado 2: Preview do Arquivo Selecionado */}
        {!internalClassifying && currentFile && (
          <div className="mb-5 overflow-hidden rounded-xl border border-brand-border bg-brand-bg p-3">
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="size-14 rounded-lg object-cover border border-brand-border"
                />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-lg bg-brand-blue-bg text-brand-blue">
                  <FileText className="size-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-brand-ink">
                  {currentFile.name}
                </p>
                <p className="text-xs font-medium text-brand-muted">
                  {formatFileSize(currentFile.size)} • Documento pronto
                </p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="rounded-lg p-2 text-brand-muted hover:bg-white hover:text-brand-ink transition"
                title="Trocar arquivo"
                disabled={isBusy}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Estado 3: Ações Responsivas (Mobile: Tirar Foto + Galeria | Desktop: Anexar Documento) */}
        {!internalClassifying && (
          <div>
            {isMobile ? (
              /* Ações Mobile */
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={triggerCamera}
                  disabled={disabled || isBusy}
                  className="flex items-center justify-center gap-2.5 rounded-xl bg-brand-blue-bright px-4 py-3.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-brand-blue active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <Camera className="size-4.5 shrink-0" />
                  <span>Tirar Foto Agora</span>
                </button>

                <button
                  type="button"
                  onClick={triggerFilePicker}
                  disabled={disabled || isBusy}
                  className="flex items-center justify-center gap-2.5 rounded-xl border-2 border-brand-border bg-white px-4 py-3.5 text-sm font-bold text-brand-ink transition-all hover:border-brand-blue-bright/50 hover:bg-brand-bg active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <Upload className="size-4.5 shrink-0 text-brand-muted" />
                  <span>Escolher da Galeria ou PDF</span>
                </button>
              </div>
            ) : (
              /* Ação Desktop */
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={triggerFilePicker}
                  disabled={disabled || isBusy}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-blue-bright px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-brand-blue active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <Upload className="size-4.5 shrink-0" />
                  <span>Anexar Documento ou PDF</span>
                </button>
                <p className="text-center text-xs font-medium text-brand-muted">
                  Arraste e solte o arquivo aqui ou clique para selecionar do computador
                </p>
              </div>
            )}
          </div>
        )}

        {/* Botão de Envio Manual Opcional (se showSubmitButton=true) */}
        {showSubmitButton && currentFile && !internalClassifying && (
          <div className="mt-4 pt-3 border-t border-brand-border/60">
            <button
              type="button"
              onClick={() => {
                if (currentFile && onSubmit) {
                  const slotToSend = activeSide === "back" ? "back" : "front";
                  onSubmit(currentFile, propMode, slotToSend as IdentitySlot);
                }
              }}
              disabled={disabled || isBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-blue-bright active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Enviando documento...</span>
                </>
              ) : (
                <>
                  <span>{submitButtonLabel || "Continuar"}</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
