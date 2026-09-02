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
  IconMapPin,
  IconUserCheck,
  IconBuilding,
  IconUsers,
  IconShieldCheck,
  IconSparkles,
  IconLoader2,
} from "@tabler/icons-react";
import type { AddressData, DocumentItem } from "./duty-status-card";
import { DocumentInspectorModal } from "./document-inspector-modal";

export interface ExtractedProofData {
  file_url?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  holder_name?: string | null;
  is_own_name?: boolean;
  matched_parent?: "mãe" | "pai" | null;
  kinship_provided?: string | null;
  address?: AddressData | null;
}

export type AddressProofStep =
  | "empty"
  | "analyzing"
  | "error"
  | "needs_kinship"
  | "satisfied";

export interface KinshipOption {
  id: string;
  label: string;
  category: "family" | "housing";
  description?: string;
}

export const DEFAULT_KINSHIP_OPTIONS: KinshipOption[] = [
  { id: "conjuge", label: "Cônjuge / Companheiro(a)", category: "family" },
  { id: "irmao", label: "Irmão ou Irmã", category: "family" },
  { id: "filho", label: "Filho ou Filha", category: "family" },
  { id: "avo", label: "Avô ou Avó", category: "family" },
  { id: "outro_familiar", label: "Outro Familiar", category: "family" },
  { id: "aluguel_locador", label: "Imóvel Alugado (Locador / Imobiliária)", category: "housing" },
  { id: "colega_quarto", label: "Colega de Quarto / República", category: "housing" },
  { id: "pensao", label: "Pensão / Alojamento", category: "housing" },
];

export interface AddressProofCaptureProps {
  /** Initial state or current value if already loaded */
  initialData?: ExtractedProofData | null;
  /** Current step (controlled or uncontrolled) */
  step?: AddressProofStep;
  /** Callback when user selects and submits a file */
  onUploadFile?: (file: File) => Promise<ExtractedProofData>;
  /** Callback when user selects kinship / justification */
  onConfirmKinship?: (kinshipId: string, customText?: string) => Promise<void>;
  /** Callback when user resets or replaces file */
  onReset?: () => void;
  /** Custom title */
  title?: string;
  /** Description */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom classes */
  className?: string;
}

export function AddressProofCapture({
  initialData,
  step: controlledStep,
  onUploadFile,
  onConfirmKinship,
  onReset,
  title = "Comprovante de Residência",
  description = "Anexe uma conta recente de luz, água, gás, internet ou telefone (últimos 90 dias). Não precisa digitar o endereço.",
  disabled = false,
  className = "",
}: AddressProofCaptureProps) {
  const [internalStep, setInternalStep] = React.useState<AddressProofStep>(
    initialData?.address?.zipcode ? "satisfied" : "empty"
  );
  const activeStep = controlledStep ?? internalStep;

  const [data, setData] = React.useState<ExtractedProofData | null>(initialData ?? null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [analysisPhase, setAnalysisPhase] = React.useState<string>("Lendo documento...");
  const [selectedKinship, setSelectedKinship] = React.useState<string>("");
  const [customKinshipText, setCustomKinshipText] = React.useState<string>("");
  const [isSubmittingKinship, setIsSubmittingKinship] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync initialData changes
  React.useEffect(() => {
    if (initialData) {
      setData(initialData);
      if (initialData.address?.zipcode) {
        setInternalStep("satisfied");
      }
    }
  }, [initialData]);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || activeStep === "analyzing") return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    // Validate format
    const validMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validMimes.includes(file.type)) {
      setErrorMessage("Formato não suportado. Por favor, envie uma foto (JPG, PNG) ou documento PDF.");
      setInternalStep("error");
      return;
    }

    // Validate size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("Arquivo muito grande. O tamanho máximo permitido é de 15 MB.");
      setInternalStep("error");
      return;
    }

    setInternalStep("analyzing");
    setErrorMessage(null);

    try {
      // Step simulated updates for transparent UX
      setAnalysisPhase("Enviando comprovante com segurança...");
      await new Promise((r) => setTimeout(r, 400));
      setAnalysisPhase("Executando leitura inteligente (OCR)...");
      await new Promise((r) => setTimeout(r, 600));
      setAnalysisPhase("Extraindo CEP, logradouro e titularidade...");

      let res: ExtractedProofData;
      if (onUploadFile) {
        res = await onUploadFile(file);
      } else {
        // Fallback demo mock if no handler passed
        const objectUrl = URL.createObjectURL(file);
        res = {
          file_url: objectUrl,
          file_name: file.name,
          mime_type: file.type,
          holder_name: "Titular do Imóvel",
          is_own_name: false,
          address: {
            zipcode: "80010-010",
            street: "Rua Marechal Deodoro",
            number: "500",
            neighborhood: "Centro",
            city: "Curitiba",
            state: "PR",
          },
        };
      }

      setData(res);

      // Determine next step
      if (res.is_own_name || res.matched_parent) {
        setInternalStep("satisfied");
      } else {
        setInternalStep("needs_kinship");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          "Não conseguimos ler os dados do comprovante. Confira se a foto está nítida e bem iluminada."
      );
      setInternalStep("error");
    }
  };

  const handleConfirmKinship = async () => {
    if (!selectedKinship) return;
    setIsSubmittingKinship(true);
    try {
      if (onConfirmKinship) {
        await onConfirmKinship(selectedKinship, customKinshipText);
      }
      setData((prev) => (prev ? { ...prev, kinship_provided: selectedKinship } : null));
      setInternalStep("satisfied");
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao salvar o vínculo. Tente novamente.");
    } finally {
      setIsSubmittingKinship(false);
    }
  };

  const handleReset = () => {
    setData(null);
    setErrorMessage(null);
    setSelectedKinship("");
    setCustomKinshipText("");
    setInternalStep("empty");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onReset) onReset();
  };

  const inspectorItem: DocumentItem | null =
    previewOpen && data?.file_url
      ? {
          id: "address",
          title: data.file_name || "Comprovante de Residência",
          category: "address",
          description: "Comprovante de residência para validação de polo regional.",
          status: "approved",
          fileUrl: data.file_url,
          fileName: data.file_name || "comprovante-residencia",
          mimeType: data.mime_type || (data.file_url.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          extractedInfo: data.address?.street
            ? `${data.address.street}, ${data.address.number || "S/N"} - ${data.address.city}/${data.address.state} (CEP: ${data.address.zipcode})`
            : null,
          kinshipHolder: data.holder_name,
          kinshipRelation: data.kinship_provided,
          allowedAudiences: ["promoter", "student"],
        }
      : null;

  return (
    <div className={`space-y-4 rounded-2xl border border-brand-border bg-white p-5 sm:p-6 shadow-sm transition-all ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue">
              <IconMapPin className="size-4.5" />
            </div>
            <h3 className="text-base font-black text-brand-ink">{title}</h3>
            {activeStep === "satisfied" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-500/30">
                <IconCircleCheck className="size-3.5" />
                <span>Verificado</span>
              </span>
            )}
          </div>
          <p className="text-xs text-brand-muted leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || activeStep === "analyzing"}
      />

      {/* 1. STATE: EMPTY */}
      {activeStep === "empty" && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-border/80 bg-slate-50/60 p-8 sm:p-10 text-center transition-all hover:border-brand-blue/60 hover:bg-brand-blue/5 cursor-pointer"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-brand-border/60 group-hover:scale-105 group-hover:ring-brand-blue/40 transition">
            <IconCloudUpload className="size-7 text-brand-blue" />
          </div>
          <h4 className="mt-4 text-sm font-bold text-brand-ink">
            Clique para selecionar ou arraste o comprovante
          </h4>
          <p className="mt-1 text-xs text-brand-muted max-w-sm">
            Formatos aceitos: <strong>PDF, JPG, PNG ou WEBP</strong> até 15MB.
          </p>
          <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-brand-blue">
            <IconSparkles className="size-3.5" />
            <span>O endereço e o CEP serão preenchidos automaticamente</span>
          </div>
        </div>
      )}

      {/* 2. STATE: ANALYZING (OCR In-Flight) */}
      {activeStep === "analyzing" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-8 sm:p-10 text-center space-y-4 animate-in fade-in duration-200">
          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-white shadow-md">
            <IconLoader2 className="size-7 text-brand-blue animate-spin" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-brand-ink">Analisando Comprovante</h4>
            <p className="text-xs text-brand-blue font-medium animate-pulse">
              {analysisPhase}
            </p>
          </div>
          <div className="w-full max-w-xs h-1.5 rounded-full bg-brand-blue/20 overflow-hidden">
            <div className="h-full bg-brand-blue rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* 3. STATE: ERROR / REJECTED */}
      {activeStep === "error" && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 shrink-0">
              <IconAlertTriangle className="size-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-red-700">Não foi possível validar o comprovante</h4>
              <p className="text-xs text-red-900/80 leading-relaxed">
                {errorMessage || "O arquivo enviado não pôde ser lido. Envie uma foto nítida da conta inteira."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow-xs cursor-pointer"
            >
              <IconRefresh className="size-3.5" />
              <span>Enviar Outro Arquivo</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-white px-4 py-2 text-xs font-semibold text-brand-muted hover:text-brand-ink hover:bg-slate-50 transition cursor-pointer"
            >
              <span>Cancelar</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. STATE: NEEDS KINSHIP / JUSTIFY */}
      {activeStep === "needs_kinship" && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3 border-b border-amber-500/20 pb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
              <IconUsers className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-brand-ink">Comprovante em Nome de Terceiro</h4>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700">
                  Vínculo Necessário
                </span>
              </div>
              <p className="text-xs text-brand-muted">
                Identificamos que a conta está no nome de{" "}
                <strong className="text-brand-ink font-bold">
                  {data?.holder_name || "outro titular"}
                </strong>
                . Selecione seu vínculo com o imóvel para aprovação imediata:
              </p>
            </div>
          </div>

          {/* Options Grid */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
              Selecione o parentesco ou tipo de residência:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_KINSHIP_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedKinship(opt.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                    selectedKinship === opt.id
                      ? "border-brand-blue bg-brand-blue/10 text-brand-blue shadow-xs font-bold ring-1 ring-brand-blue"
                      : "border-brand-border/70 bg-white text-brand-ink hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {opt.category === "family" ? (
                      <IconUserCheck className="size-4 opacity-70" />
                    ) : (
                      <IconBuilding className="size-4 opacity-70" />
                    )}
                    <span>{opt.label}</span>
                  </div>
                  {selectedKinship === opt.id && (
                    <IconCircleCheck className="size-4 text-brand-blue shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-brand-muted hover:text-brand-ink hover:underline cursor-pointer"
            >
              Trocar Comprovante
            </button>
            <button
              type="button"
              onClick={handleConfirmKinship}
              disabled={!selectedKinship || isSubmittingKinship}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              {isSubmittingKinship && <IconLoader2 className="size-3.5 animate-spin" />}
              <span>Confirmar Vínculo & Avançar</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. STATE: SATISFIED / APPROVED */}
      {activeStep === "satisfied" && data && (
        <div className="rounded-2xl border border-emerald-500/30 bg-linear-to-br from-emerald-500/5 via-white to-white p-5 sm:p-6 space-y-4 animate-in fade-in duration-200 shadow-2xs">
          {/* Top: Address Display */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-4">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                Endereço Extraído com Sucesso
              </span>
              <h4 className="text-base font-black text-brand-ink">
                {data.address?.street}
                {data.address?.number ? `, ${data.address.number}` : ""}
                {data.address?.complement ? ` - ${data.address.complement}` : ""}
              </h4>
              <p className="text-xs text-brand-muted">
                {data.address?.neighborhood ? `${data.address.neighborhood}, ` : ""}
                {data.address?.city} - {data.address?.state} • CEP {data.address?.zipcode}
              </p>
            </div>

            {/* Holder info pill */}
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="text-[11px] text-brand-muted">Titular da Conta:</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-brand-ink border border-brand-border/60">
                <IconShieldCheck className="size-3.5 text-emerald-600" />
                <span>{data.holder_name || "Titular Confirmado"}</span>
              </span>
              {data.matched_parent && (
                <span className="text-[10px] text-emerald-600 font-semibold">
                  Filiação confirmada ({data.matched_parent}) ✓
                </span>
              )}
              {data.kinship_provided && (
                <span className="text-[10px] text-slate-500 font-medium">
                  Vínculo: {data.kinship_provided}
                </span>
              )}
            </div>
          </div>

          {/* Bottom actions: GET / View Document & Replace */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {/* GET Document Preview Button */}
              {data.file_url && (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3.5 py-2 text-xs font-bold text-brand-ink hover:bg-slate-50 hover:border-brand-border/80 transition shadow-2xs cursor-pointer"
                >
                  <IconEye className="size-3.5 text-brand-blue" />
                  <span>Visualizar Comprovante</span>
                </button>
              )}

              {data.file_url && (
                <a
                  href={data.file_url}
                  download={data.file_name || "comprovante-residencia"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-muted hover:text-brand-ink hover:bg-slate-50 transition cursor-pointer"
                >
                  <IconDownload className="size-3.5" />
                  <span>Baixar</span>
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-brand-muted hover:text-brand-ink hover:underline cursor-pointer ml-auto"
            >
              Substituir Comprovante
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE INSPEÇÃO DO DOCUMENTO (GET) */}
      <DocumentInspectorModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        item={inspectorItem}
      />
    </div>
  );
}
