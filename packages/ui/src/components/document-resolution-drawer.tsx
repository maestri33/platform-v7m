"use client";

import * as React from "react";
import {
  IconX,
  IconFileText,
  IconCloudUpload,
  IconCircleCheck,
  IconAlertTriangle,
  IconRefresh,
  IconEye,
  IconCamera,
  IconShieldExclamation,
  IconSchool,
  IconKey,
  IconCertificate,
  IconChecklist,
  IconAward,
  IconSparkles,
  IconLoader2,
  IconShieldCheck,
  IconChevronRight,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { ContractSignature, DocumentItem, DocumentTypeKey, PersonaType } from "./duty-status-card";
import { DOCUMENT_ICONS } from "./duty-status-card";
import { DutyMiniPill } from "./duty-mini-pill";
import { AddressProofCapture, ExtractedProofData } from "./address-proof-capture";
import { BiometricsLivenessCapture } from "./biometrics-liveness-capture";
import { ContractSigner } from "./contract-signer";
import { DocumentInspectorModal } from "./document-inspector-modal";

export interface DocumentResolutionDrawerProps {
  /** Whether the resolution drawer is visible */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Active document item targeted for resolution */
  item: DocumentItem | null;
  /** User persona: Promoter or Student */
  persona: PersonaType;
  /** Callback when user uploads a standard document file */
  onResolveUpload?: (item: DocumentItem, file: File) => Promise<void>;
  /** Callback when user confirms a kinship relation for address proof */
  onResolveKinship?: (item: DocumentItem, kinshipId: string, customText?: string) => Promise<void>;
  /** Callback when user signs the legal contract */
  onResolveSignContract?: (item: DocumentItem, signature: ContractSignature) => Promise<void>;
  /** Callback when user captures and validates biometric selfie */
  onResolveBiometrics?: (item: DocumentItem, file: File, score?: number) => Promise<void>;
  /** Custom wrapper CSS classes */
  className?: string;
}

export function DocumentResolutionDrawer({
  isOpen,
  onClose,
  item,
  persona,
  onResolveUpload,
  onResolveKinship,
  onResolveSignContract,
  onResolveBiometrics,
  className = "",
}: DocumentResolutionDrawerProps) {
  const [selectedDocTypeChoice, setSelectedDocTypeChoice] = React.useState<"rg" | "cnh">("rg");
  const [identityCaptureMode, setIdentityCaptureMode] = React.useState<"front_back" | "full_open">("front_back");
  const [pixKeyType, setPixKeyType] = React.useState<"cpf" | "email" | "phone" | "random">("cpf");
  const [pixKeyValue, setPixKeyValue] = React.useState("");
  const [pixSubmitted, setPixSubmitted] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Reset internal states on item change
  React.useEffect(() => {
    if (isOpen && item) {
      setErrorMessage(null);
      setIsUploading(false);
      setPixSubmitted(false);
      setSelectedDocTypeChoice(persona === "student" ? "rg" : "rg");
    }
  }, [isOpen, item?.id, persona]);

  // Handle ESC key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isInspectorOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isInspectorOpen, onClose]);

  if (!isOpen || !item) return null;

  const IconComponent = DOCUMENT_ICONS[item.id] || IconFileText;

  const handleStandardFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onResolveUpload) return;

    setIsUploading(true);
    setErrorMessage(null);
    try {
      await onResolveUpload(item, file);
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao processar o arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleIdentityUpload = async (file: File) => {
    if (persona === "student" && selectedDocTypeChoice === "cnh") {
      setErrorMessage("O MEC veda expressamente o uso de CNH para emissão de Certificado EJA. Envie seu RG ou CIN.");
      return;
    }

    if (!onResolveUpload) return;
    setIsUploading(true);
    setErrorMessage(null);
    try {
      await onResolveUpload(item, file);
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao processar o documento de identidade.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePixSubmit = async () => {
    if (!pixKeyValue.trim() || !onResolveUpload) return;
    setIsUploading(true);
    try {
      // Create a virtual PIX record file payload
      const pixBlob = new Blob(
        [JSON.stringify({ type: pixKeyType, key: pixKeyValue, validatedAt: new Date().toISOString() })],
        { type: "application/json" }
      );
      const pixFile = new File([pixBlob], `pix-${pixKeyType}-${Date.now()}.json`, { type: "application/json" });
      await onResolveUpload(item, pixFile);
      setPixSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao salvar a chave PIX.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900 border-l border-slate-800 text-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolution-drawer-title"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-blue/20 text-brand-blue-bright border border-brand-blue/30">
              <IconComponent className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="resolution-drawer-title" className="text-base font-black text-white">
                  {item.title}
                </h3>
                <DutyMiniPill status={item.status} size="sm" />
              </div>
              <p className="text-xs text-slate-400">
                {persona === "promoter" ? "Portal do Promotor" : "Pasta Acadêmica do Aluno"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Fechar (Esc)"
            aria-label="Fechar Gaveta"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <IconX className="size-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error notice if present */}
          {errorMessage && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-3 text-xs text-red-300 animate-in fade-in">
              <IconAlertTriangle className="size-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-red-200">Atenção</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* DYNAMIC RESOLUTION VIEWS BASED ON ITEM ID */}

          {/* 1. IDENTITY VIEW (RG vs CNH Enforcement) */}
          {item.id === "identity" && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                  Selecione o Tipo de Documento:
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDocTypeChoice("rg");
                      setErrorMessage(null);
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      selectedDocTypeChoice === "rg"
                        ? "border-brand-blue bg-brand-blue/20 text-white ring-1 ring-brand-blue"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <IconFileText className="size-4" />
                    <span>RG / CIN (Identidade)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDocTypeChoice("cnh");
                      if (persona === "student") {
                        setErrorMessage(
                          "Atenção: Para o Aluno EJA, o MEC/SISTEC exige estritamente RG ou CIN para emissão do diploma. A CNH não é aceita."
                        );
                      } else {
                        setErrorMessage(null);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      selectedDocTypeChoice === "cnh"
                        ? persona === "student"
                          ? "border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500"
                          : "border-brand-blue bg-brand-blue/20 text-white ring-1 ring-brand-blue"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <IconShieldExclamation className="size-4" />
                    <span>CNH (Habilitação)</span>
                  </button>
                </div>

                {/* Regulatory Student Alert */}
                {persona === "student" && (
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-3 text-[11px] text-blue-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <IconSchool className="size-4 text-blue-400" />
                      <span>Exigência Regulatória MEC / SISTEC</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Para fins de registro acadêmico e publicação em Diário Oficial, o MEC aceita
                      exclusivamente <strong>RG (Registro Geral)</strong> ou <strong>CIN (Carteira de Identidade Nacional)</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-8 text-center transition-all hover:border-brand-blue hover:bg-brand-blue/5 cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleIdentityUpload(file);
                  }}
                />

                <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 shadow-md ring-1 ring-slate-700 group-hover:scale-105 group-hover:ring-brand-blue/40 transition">
                  {isUploading ? (
                    <IconLoader2 className="size-7 text-brand-blue-bright animate-spin" />
                  ) : (
                    <IconCloudUpload className="size-7 text-brand-blue-bright" />
                  )}
                </div>

                <h4 className="mt-4 text-sm font-bold text-white">
                  {isUploading
                    ? "Enviando e validando documento..."
                    : `Clique para enviar a foto do ${selectedDocTypeChoice.toUpperCase()}`}
                </h4>
                <p className="mt-1 text-xs text-slate-400 max-w-sm">
                  Formatos aceitos: <strong>PDF, JPG, PNG ou WEBP</strong> até 15MB.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-brand-blue-bright">
                  <IconSparkles className="size-3.5" />
                  <span>Leitura instantânea de CPF, Nome e Filiação via OCR</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. ADDRESS PROOF CAPTURE VIEW */}
          {item.id === "address" && (
            <AddressProofCapture
              title="Validação do Comprovante de Residência"
              description="Anexe sua conta de consumo (luz, água, gás ou internet). O endereço será preenchido automaticamente por OCR."
              onUploadFile={async (file) => {
                if (onResolveUpload) {
                  await onResolveUpload(item, file);
                }
                return {
                  file_url: URL.createObjectURL(file),
                  file_name: file.name,
                  mime_type: file.type,
                  holder_name: item.kinshipHolder || "Titular do Comprovante",
                  is_own_name: Boolean(item.status === "approved"),
                  address: item.addressData || {
                    zipcode: "80010-010",
                    street: "Rua Marechal Deodoro",
                    number: "500",
                    neighborhood: "Centro",
                    city: "Curitiba",
                    state: "PR",
                  },
                };
              }}
              onConfirmKinship={async (kinshipId, customText) => {
                if (onResolveKinship) {
                  await onResolveKinship(item, kinshipId, customText);
                }
              }}
            />
          )}

          {/* 3. BIOMETRICS FACIAL SELFIE VIEW */}
          {item.id === "selfie" && (
            <BiometricsLivenessCapture
              file={null}
              title="Captura Biométrica com Liveness"
              description="Enquadre o rosto no círculo oval para biometria facial regulamentar."
              onCapture={async (file, score) => {
                if (file && onResolveBiometrics) {
                  await onResolveBiometrics(item, file, score);
                }
              }}
            />
          )}

          {/* 4. CONTRACT SIGNER VIEW */}
          {item.id === "contract" && (
            <ContractSigner
              persona={persona}
              initialSignature={item.signature}
              onSign={async (sig) => {
                if (onResolveSignContract) {
                  await onResolveSignContract(item, sig);
                }
              }}
            />
          )}

          {/* 5. PIX FINANCIAL KEY VIEW */}
          {item.id === "pix" && (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-blue/20 text-brand-blue-bright">
                  <IconKey className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Chave PIX para Repasses Semanais</h4>
                  <p className="text-xs text-slate-400">
                    Os repasses de comissão de R$ 100 por matrícula são pagos toda sexta-feira.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-400 block">Tipo de Chave:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["cpf", "email", "phone", "random"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPixKeyType(type)}
                      className={`p-2.5 rounded-xl border text-xs font-bold capitalize transition cursor-pointer ${
                        pixKeyType === type
                          ? "border-brand-blue bg-brand-blue/20 text-white ring-1 ring-brand-blue"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      {type === "random" ? "Aleatória" : type.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Informe a Chave:</label>
                  <input
                    type="text"
                    value={pixKeyValue}
                    onChange={(e) => setPixKeyValue(e.target.value)}
                    placeholder={
                      pixKeyType === "cpf"
                        ? "000.000.000-00"
                        : pixKeyType === "email"
                          ? "seuemail@exemplo.com"
                          : pixKeyType === "phone"
                            ? "(00) 90000-0000"
                            : "Chave aleatória gerada pelo banco"
                    }
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePixSubmit}
                  disabled={!pixKeyValue.trim() || isUploading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue hover:bg-blue-600 disabled:opacity-40 text-white px-4 py-2.5 text-xs font-bold transition shadow-md cursor-pointer disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    <IconCircleCheck className="size-3.5" />
                  )}
                  <span>Salvar e Validar Chave PIX</span>
                </button>
              </div>
            </div>
          )}

          {/* 6. GENERIC CIVIL/ACADEMIC UPLOADER (School History, Civil Cert, Voter, Military) */}
          {["school_history", "civil_certificate", "voter_card", "military_certificate"].includes(item.id) && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Instruções para Envio
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.id === "school_history" &&
                    "Envie o Histórico Escolar ou Declaração de Conclusão do Ensino Fundamental para aproveitamento de estudos e montagem do prontuário acadêmico."}
                  {item.id === "civil_certificate" &&
                    "Envie a Certidão de Nascimento ou de Casamento legível, com selo e carimbo do cartório de registro civil visíveis."}
                  {item.id === "voter_card" &&
                    "Envie o Título de Eleitor ou Certidão de Quitação Eleitoral emitida pelo TSE (obrigatório para expedição de diploma)."}
                  {item.id === "military_certificate" &&
                    "Envie o Certificado de Reservista ou Certificado de Dispensa de Incorporação (CDI) para estudantes do sexo masculino entre 18 e 45 anos."}
                </p>
              </div>

              {/* File upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-8 text-center transition-all hover:border-brand-blue hover:bg-brand-blue/5 cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleStandardFileUpload}
                />

                <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 shadow-md ring-1 ring-slate-700 group-hover:scale-105 group-hover:ring-brand-blue/40 transition">
                  {isUploading ? (
                    <IconLoader2 className="size-7 text-brand-blue-bright animate-spin" />
                  ) : (
                    <IconCloudUpload className="size-7 text-brand-blue-bright" />
                  )}
                </div>

                <h4 className="mt-4 text-sm font-bold text-white">
                  {isUploading ? "Enviando arquivo..." : `Selecionar ${item.title}`}
                </h4>
                <p className="mt-1 text-xs text-slate-400 max-w-sm">
                  Formatos aceitos: <strong>PDF, JPG, PNG ou WEBP</strong> até 15MB.
                </p>
              </div>
            </div>
          )}

          {/* If already approved, show inspect trigger */}
          {item.status === "approved" && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <IconCircleCheck className="size-5" />
                  <span>Documento Verificado e Aprovado</span>
                </div>
                <DutyMiniPill status="approved" size="sm" />
              </div>

              <p className="text-xs text-slate-300">
                Este item já foi processado e validado no sistema. Você pode inspecionar os dados ou substituir o arquivo se necessário.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <IconEye className="size-3.5 text-brand-blue" />
                  <span>Abrir no Inspetor (GET)</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-slate-400 hover:text-white hover:underline cursor-pointer"
                >
                  Substituir Arquivo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 text-xs font-bold transition cursor-pointer"
          >
            Fechar
          </button>

          {item.fileUrl && (
            <button
              type="button"
              onClick={() => setIsInspectorOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue-bright hover:underline cursor-pointer"
            >
              <span>Ver no Inspetor</span>
              <IconChevronRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inspector Modal Trigger */}
      <DocumentInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        item={item}
      />
    </>
  );
}
