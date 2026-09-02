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
  IconX,
  IconMapPin,
  IconCamera,
  IconKey,
  IconSchool,
  IconAward,
  IconCertificate,
  IconChecklist,
  IconShieldExclamation,
  IconLoader2,
  IconExternalLink,
  IconShieldCheck,
  IconBuilding,
  IconUsers,
} from "@tabler/icons-react";
import { DutyMiniPill } from "./duty-mini-pill";
import { DocumentInspectorModal } from "./document-inspector-modal";

export type PersonaType = "promoter" | "student";

export type DocumentTypeKey =
  | "identity"
  | "selfie"
  | "address"
  | "pix"
  | "school_history"
  | "civil_certificate"
  | "voter_card"
  | "military_certificate"
  | "contract";

export type DocumentStatus =
  | "empty"
  | "analyzing"
  | "needs_action"
  | "needs_kinship"
  | "review"
  | "approved";

export type KinshipType =
  | "conjuge"
  | "irmao"
  | "filho"
  | "avo"
  | "outro_familiar"
  | "aluguel_locador"
  | "colega_quarto"
  | "pensao";

export interface AddressData {
  zipcode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface ContractSignature {
  accepted: boolean;
  signedAt: string; // ISO 8601
  ipAddress?: string | null;
  userAgent?: string | null;
  signatureHash?: string | null;
  contractVersion?: string | null;
}

export interface DocumentItem {
  id: DocumentTypeKey;
  title: string;
  category: "civil" | "biometric" | "address" | "finance" | "academic" | "legal";
  description: string;
  status: DocumentStatus;
  statusLabel?: string;
  extractedInfo?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  reason?: string | null;
  kinshipHolder?: string | null;
  kinshipRelation?: KinshipType | string | null;
  addressData?: AddressData | null;
  signature?: ContractSignature | null;
  biometricScore?: number | null;
  allowedAudiences: PersonaType[];
  updatedAt?: string | null;
}

export const DOCUMENT_ICONS: Record<DocumentTypeKey, React.ComponentType<{ className?: string }>> = {
  identity: IconFileText,
  selfie: IconCamera,
  address: IconMapPin,
  pix: IconKey,
  school_history: IconSchool,
  civil_certificate: IconCertificate,
  voter_card: IconChecklist,
  military_certificate: IconShieldExclamation,
  contract: IconAward,
};

export interface DutyStatusCardProps {
  item: DocumentItem;
  audience?: PersonaType;
  onUpload?: (item: DocumentItem, file: File) => Promise<void>;
  onViewDocument?: (item: DocumentItem) => void;
  onResolveAction?: (item: DocumentItem) => void;
  onSignContract?: (item: DocumentItem) => Promise<void>;
  className?: string;
}

export function DutyStatusCard({
  item,
  audience = "promoter",
  onUpload,
  onViewDocument,
  onResolveAction,
  onSignContract,
  className = "",
}: DutyStatusCardProps) {
  const IconComponent = DOCUMENT_ICONS[item.id] || IconFileText;
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    setIsUploading(true);
    try {
      await onUpload(item, file);
    } finally {
      setIsUploading(false);
    }
  };

  const isApproved = item.status === "approved";
  const isAnalyzing = item.status === "analyzing" || isUploading;
  const isNeedsKinship = item.status === "needs_kinship";
  const isNeedsAction = item.status === "needs_action";
  const isReview = item.status === "review";
  const isEmpty = item.status === "empty";

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border p-4.5 sm:p-5 transition-all shadow-md ${
        isApproved
          ? "border-emerald-500/40 bg-slate-900/95"
          : isAnalyzing
            ? "border-blue-500/40 bg-slate-900/95"
            : isNeedsKinship
              ? "border-amber-500/40 bg-slate-900/95 ring-1 ring-amber-500/20"
              : isNeedsAction
                ? "border-red-500/40 bg-slate-900/95 ring-1 ring-red-500/20"
                : isReview
                  ? "border-amber-400/40 bg-slate-900/95"
                  : "border-slate-800 bg-slate-900/95 hover:border-slate-700"
      } ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="space-y-3">
        {/* Top bar: Icon & Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div
            className={`p-2.5 rounded-xl transition ${
              isApproved
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isAnalyzing
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : isNeedsKinship
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : isNeedsAction
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
            }`}
          >
            <IconComponent className="size-5" />
          </div>

          <DutyMiniPill status={item.status} size="sm" />
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h4 className="text-sm font-black text-white leading-snug">{item.title}</h4>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Dynamic Context Feedback */}
        {isApproved && item.extractedInfo && (
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-[11px] font-medium text-slate-300 space-y-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
              Dados Extraídos:
            </span>
            <p className="truncate font-semibold text-white">{item.extractedInfo}</p>
          </div>
        )}

        {isNeedsKinship && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-300 font-medium">
            Conta em nome de <strong>{item.kinshipHolder || "terceiro"}</strong>. Confirme o vínculo.
          </div>
        )}

        {isNeedsAction && item.reason && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-2.5 text-[11px] text-red-300 font-medium">
            {item.reason}
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between gap-2">
        {isApproved && (
          <>
            <button
              type="button"
              onClick={() => {
                if (onViewDocument) {
                  onViewDocument(item);
                } else if (onResolveAction) {
                  onResolveAction(item);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <IconEye className="size-3.5 text-brand-blue" />
              <span>Ver {item.id === "contract" ? "Contrato" : "Documento"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onResolveAction) {
                  onResolveAction(item);
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="text-[11px] font-semibold text-slate-400 hover:text-white hover:underline cursor-pointer ml-auto"
            >
              Substituir
            </button>
          </>
        )}

        {isEmpty && item.id === "contract" && (
          <button
            type="button"
            onClick={() => {
              if (onResolveAction) {
                onResolveAction(item);
              } else if (onSignContract) {
                onSignContract(item);
              }
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <IconAward className="size-3.5" />
            <span>Assinar Digitalmente</span>
          </button>
        )}

        {isEmpty && item.id !== "contract" && (
          <button
            type="button"
            onClick={() => {
              if (onResolveAction) {
                onResolveAction(item);
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <IconCloudUpload className="size-3.5" />
            <span>Enviar Arquivo</span>
          </button>
        )}

        {isNeedsKinship && (
          <button
            type="button"
            onClick={() => {
              if (onResolveAction) {
                onResolveAction(item);
              }
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <IconUsers className="size-3.5" />
            <span>Informar Vínculo</span>
          </button>
        )}

        {isNeedsAction && (
          <button
            type="button"
            onClick={() => {
              if (onResolveAction) {
                onResolveAction(item);
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <IconRefresh className="size-3.5" />
            <span>Reenviar Arquivo</span>
          </button>
        )}

        {isAnalyzing && (
          <div className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-blue-400">
            <IconLoader2 className="size-4 animate-spin" />
            <span>Processando Leitura...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export interface DocumentHubGridProps {
  audience: PersonaType;
  items: DocumentItem[];
  title?: string;
  description?: string;
  onUpload?: (item: DocumentItem, file: File) => Promise<void>;
  onSignContract?: (item: DocumentItem) => Promise<void>;
  onResolveAction?: (item: DocumentItem) => void;
  className?: string;
}

export function DocumentHubGrid({
  audience,
  items,
  title,
  description,
  onUpload,
  onSignContract,
  onResolveAction,
  className = "",
}: DocumentHubGridProps) {
  const [selectedItemForView, setSelectedItemForView] = React.useState<DocumentItem | null>(null);

  const filteredItems = items.filter((item) => item.allowedAudiences.includes(audience));
  const completedCount = filteredItems.filter((i) => i.status === "approved").length;
  const totalCount = filteredItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Progress Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-3xl shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <IconShieldCheck className="size-5" />
            </div>
            <h3 className="text-lg font-black text-white">
              {title || (audience === "promoter" ? "Central de Documentos do Promotor" : "Pasta Acadêmica do Aluno")}
            </h3>
          </div>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            {description ||
              (audience === "promoter"
                ? "Documentação para liberação de repasses via PIX toda sexta-feira."
                : "Documentação escolar e civil obrigatória para emissão oficial do Certificado MEC.")}
          </p>
        </div>

        {/* Progress Pill */}
        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Progresso Geral:</span>
            <span className="text-sm font-black text-white">
              {completedCount} de {totalCount} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full sm:w-44 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Responsive Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <DutyStatusCard
            key={item.id}
            item={item}
            audience={audience}
            onUpload={onUpload}
            onViewDocument={(doc) => setSelectedItemForView(doc)}
            onResolveAction={onResolveAction}
            onSignContract={onSignContract}
          />
        ))}
      </div>

      {/* In-App Document Viewer Modal (GET) */}
      <DocumentInspectorModal
        isOpen={Boolean(selectedItemForView)}
        onClose={() => setSelectedItemForView(null)}
        item={selectedItemForView}
      />
    </div>
  );
}
