"use client";

import * as React from "react";
import {
  IconCamera,
  IconUpload,
  IconCheck,
  IconAlertTriangle,
  IconRefresh,
  IconLoader2,
  IconArrowRight,
} from "@tabler/icons-react";
import { cn } from "../lib/utils";
import { FileUpload } from "./file-upload";
import {
  IdentityDocTriggerIcon,
  type IdentityDocStatus,
  type IdentityDocFile,
  type IdentityRole,
  type FastClassifyResult,
} from "./identity-doc-trigger-icon";

export interface IdentityDocumentCaptureFlowProps {
  /** Papel do usuário no ecossistema: aluno ou promotor */
  role?: IdentityRole;
  /** Status atual do documento de identificação */
  status?: IdentityDocStatus;
  /** Motivo da rejeição se houver */
  rejectionReason?: string | null;
  /** Callback quando o status ou motivo muda */
  onStatusChange?: (newStatus: IdentityDocStatus, reason?: string | null) => void;
  /** Arquivos já confirmados/carregados */
  initialFiles?: IdentityDocFile[];
  /** Endpoint customizado do proxy de IA para o gateway ai.v7m.live */
  aiEndpoint?: string;
  /** Função de upload para o backend (disparada após validação aprovada pela IA) */
  onSubmitToBackend?: (files: {
    front?: File | null;
    back?: File | null;
    full?: File | null;
  }) => Promise<void>;
  /** Callback quando o documento é submetido com sucesso e entra em análise */
  onSubmitted?: () => void;
  className?: string;
}

function useIsMobileDevice() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || "";
      const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouch = navigator.maxTouchPoints > 0 || window.innerWidth < 768;
      setIsMobile(isMobileUA || isTouch);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
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
  expectingSide: "any" | "front" | "back" = "any",
  aiEndpoint = "/api/ai/fast-classify"
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

    const response = await fetch(aiEndpoint, {
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
    // Fallback silencioso
  }

  return fallbackClientClassification(file, role, expectingSide, isPdf);
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

function fallbackClientClassification(
  file: File,
  role: IdentityRole,
  expectingSide: "any" | "front" | "back",
  isPdf: boolean
): FastClassifyResult {
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

export function IdentityDocumentCaptureFlow({
  role = "student",
  status: initialStatus = "empty",
  rejectionReason: initialRejectionReason = null,
  onStatusChange,
  initialFiles = [],
  aiEndpoint = "/api/ai/fast-classify",
  onSubmitToBackend,
  onSubmitted,
  className,
}: IdentityDocumentCaptureFlowProps) {
  const isMobile = useIsMobileDevice();

  const [currentStatus, setCurrentStatus] = React.useState<IdentityDocStatus>(initialStatus);
  const [currentRejection, setCurrentRejection] = React.useState<string | null>(initialRejectionReason);

  const [firstSideFile, setFirstSideFile] = React.useState<File | null>(null);
  const [firstSideType, setFirstSideType] = React.useState<"front" | "back" | null>(null);
  const [secondSideFile, setSecondSideFile] = React.useState<File | null>(null);

  const [isValidatingAi, setIsValidatingAi] = React.useState(false);
  const [isSubmittingBackend, setIsSubmittingBackend] = React.useState(false);

  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setCurrentStatus(initialStatus);
  }, [initialStatus]);

  React.useEffect(() => {
    setCurrentRejection(initialRejectionReason);
  }, [initialRejectionReason]);

  const updateStatus = (newStatus: IdentityDocStatus, reason: string | null = null) => {
    setCurrentStatus(newStatus);
    setCurrentRejection(reason);
    onStatusChange?.(newStatus, reason);
  };

  const handlePrimaryFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setIsValidatingAi(true);
    setCurrentRejection(null);

    const result = await fastClassifyWithAi(file, role, "any", aiEndpoint);
    setIsValidatingAi(false);

    if (result.rejectionReason) {
      updateStatus("rejected", result.rejectionReason);
      return;
    }

    if (result.docType === "rg" && (result.sidesPresent === "front" || result.sidesPresent === "back")) {
      setFirstSideFile(file);
      setFirstSideType(result.sidesPresent);
      return;
    }

    await submitFilesToBackend({ full: file });
  };

  const handleSecondaryFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file || !firstSideFile || !firstSideType) return;

    const neededSide = firstSideType === "front" ? "back" : "front";

    setIsValidatingAi(true);
    setCurrentRejection(null);

    const result = await fastClassifyWithAi(file, role, neededSide, aiEndpoint);
    setIsValidatingAi(false);

    if (result.rejectionReason) {
      updateStatus("rejected", result.rejectionReason);
      return;
    }

    setSecondSideFile(file);

    const payload =
      firstSideType === "front"
        ? { front: firstSideFile, back: file }
        : { front: file, back: firstSideFile };

    await submitFilesToBackend(payload);
  };

  const submitFilesToBackend = async (payload: {
    front?: File | null;
    back?: File | null;
    full?: File | null;
  }) => {
    setIsSubmittingBackend(true);
    try {
      if (onSubmitToBackend) {
        await onSubmitToBackend(payload);
      }
      updateStatus("analyzing", null);
      onSubmitted?.();
    } catch {
      updateStatus("rejected", "Falha de conexão ao enviar o documento. Tente novamente.");
    } finally {
      setIsSubmittingBackend(false);
    }
  };

  const handleReset = () => {
    setFirstSideFile(null);
    setFirstSideType(null);
    setSecondSideFile(null);
    updateStatus("empty", null);
  };

  const isPendingSecondSide = Boolean(firstSideFile && firstSideType && !secondSideFile);

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* 1. Header do Gatilho: Card Branco Institucional com Sombreamento Suave */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <IdentityDocTriggerIcon
            status={currentStatus}
            size="md"
            pulse
            files={initialFiles}
          />
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {role === "student" ? "RG (Registro Geral)" : "Documento de Identificação"}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {currentStatus === "ok"
                ? "Documento verificado e aprovado"
                : currentStatus === "analyzing"
                ? "Em análise pela coordenação..."
                : currentStatus === "rejected"
                ? "Envio pendente de ajuste"
                : "Envie a foto ou PDF do documento"}
            </p>
          </div>
        </div>

        {currentStatus === "rejected" && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <IconRefresh size={14} />
            <span>Tentar de novo</span>
          </button>
        )}
      </div>

      {/* 2. ALERTA DE MOTIVO DE REJEIÇÃO */}
      {currentStatus === "rejected" && currentRejection && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5 shadow-xs animate-in fade-in duration-150">
          <IconAlertTriangle size={18} className="shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <span className="font-bold block">Atenção ao motivo da rejeição:</span>
            <span className="leading-relaxed font-medium block">{currentRejection}</span>
          </div>
        </div>
      )}

      {/* 3. CAPTAÇÃO (VAZIO OU REJEITADO) */}
      {(currentStatus === "empty" || currentStatus === "rejected") && (
        <div className="space-y-3">
          {!isPendingSecondSide && (
            <div>
              {isMobile ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isValidatingAi || isSubmittingBackend}
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
                    disabled={isValidatingAi || isSubmittingBackend}
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
                    onChange={(e) => handlePrimaryFileSelect(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handlePrimaryFileSelect(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                </div>
              ) : (
                <FileUpload
                  title="Anexe seu RG ou documento oficial"
                  description="Arraste o arquivo ou clique para selecionar (PNG, JPG ou PDF)"
                  accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"], "application/pdf": [".pdf"] }}
                  onChange={(files: File[] | File | null) =>
                    handlePrimaryFileSelect(Array.isArray(files) ? files : [files].filter(Boolean) as File[])
                  }
                />
              )}
            </div>
          )}

          {/* LADO FALTANTE (PROGRESSIVO) */}
          {isPendingSecondSide && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-blue-200 shadow-xs space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <IconCheck size={16} />
                  <span>{firstSideType === "front" ? "Frente do RG recebida" : "Verso do RG recebido"}</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-slate-800 transition"
                >
                  Substituir
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-blue-900">
                  {firstSideType === "front" ? "Agora envie o VERSO do RG:" : "Agora envie a FRENTE do RG:"}
                </p>

                {isMobile ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={isValidatingAi || isSubmittingBackend}
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-3 rounded-xl bg-white border border-blue-200 text-blue-900 flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <IconCamera size={16} className="text-blue-700" />
                      <span>Fotografar</span>
                    </button>
                    <button
                      type="button"
                      disabled={isValidatingAi || isSubmittingBackend}
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
                      onChange={(e) => handleSecondaryFileSelect(Array.from(e.target.files || []))}
                      className="hidden"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleSecondaryFileSelect(Array.from(e.target.files || []))}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <FileUpload
                    title={firstSideType === "front" ? "Anexe o Verso do RG" : "Anexe a Frente do RG"}
                    description="Arraste o arquivo ou clique para selecionar"
                    accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"], "application/pdf": [".pdf"] }}
                    onChange={(files: File[] | File | null) =>
                      handleSecondaryFileSelect(Array.isArray(files) ? files : [files].filter(Boolean) as File[])
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* Feedback de IA */}
          {isValidatingAi && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-center justify-center gap-2 shadow-xs animate-pulse">
              <IconLoader2 size={15} className="animate-spin text-amber-600" />
              <span>Conferindo nitidez e documento…</span>
            </div>
          )}

          {/* Feedback de Envio */}
          {isSubmittingBackend && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 flex items-center justify-center gap-2 shadow-xs animate-pulse">
              <IconLoader2 size={15} className="animate-spin text-blue-600" />
              <span>Enviando documento…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
