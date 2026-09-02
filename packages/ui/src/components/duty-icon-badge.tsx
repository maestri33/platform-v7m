"use client";

import * as React from "react";
import {
  IconFileText,
  IconCamera,
  IconMapPin,
  IconKey,
  IconSchool,
  IconCertificate,
  IconChecklist,
  IconShieldExclamation,
  IconAward,
  IconLoader2,
} from "@tabler/icons-react";
import type { DocumentItem, DocumentStatus, DocumentTypeKey } from "./duty-status-card";
import { DOCUMENT_ICONS } from "./duty-status-card";

export interface DutyIconBadgeProps {
  /** The type of document to display the icon for */
  documentType: DocumentTypeKey;
  /** Current lifecycle status */
  status: DocumentStatus;
  /** Badge size */
  size?: "sm" | "md" | "lg";
  /** Optional custom tooltip / label */
  label?: string;
  /** Whether to show the outer status ring border */
  showRing?: boolean;
  /** Whether to show the status indicator dot */
  showDot?: boolean;
  /** Whether to enable hover tooltip */
  showTooltip?: boolean;
  /** Whether to pulse when analyzing */
  pulseOnAnalyzing?: boolean;
  /** Click action handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Optional document item context */
  item?: DocumentItem;
}

const SIZE_CONFIGS = {
  sm: {
    container: "size-7 rounded-lg",
    icon: "size-3.5",
    dot: "size-2 -bottom-0.5 -right-0.5 ring-[1.5px]",
  },
  md: {
    container: "size-9 rounded-xl",
    icon: "size-4.5",
    dot: "size-2.5 -bottom-0.5 -right-0.5 ring-2",
  },
  lg: {
    container: "size-11 rounded-2xl",
    icon: "size-5.5",
    dot: "size-3 -bottom-1 -right-1 ring-2",
  },
};

const STATUS_CONFIGS: Record<
  DocumentStatus,
  {
    bg: string;
    border: string;
    text: string;
    ring: string;
    dotBg: string;
    labelPt: string;
  }
> = {
  empty: {
    bg: "bg-slate-800",
    border: "border-slate-700",
    text: "text-slate-400",
    ring: "ring-slate-600/30",
    dotBg: "bg-slate-400",
    labelPt: "Pendente",
  },
  analyzing: {
    bg: "bg-blue-950/80",
    border: "border-blue-500/50",
    text: "text-blue-400",
    ring: "ring-blue-500/40",
    dotBg: "bg-blue-500",
    labelPt: "Lendo (OCR)...",
  },
  needs_kinship: {
    bg: "bg-amber-950/80",
    border: "border-amber-500/50",
    text: "text-amber-400",
    ring: "ring-amber-500/40",
    dotBg: "bg-amber-500",
    labelPt: "Vínculo Pendente",
  },
  needs_action: {
    bg: "bg-red-950/80",
    border: "border-red-500/50",
    text: "text-red-400",
    ring: "ring-red-500/40",
    dotBg: "bg-red-500",
    labelPt: "Ajuste Necessário",
  },
  review: {
    bg: "bg-amber-950/80",
    border: "border-amber-400/50",
    text: "text-amber-300",
    ring: "ring-amber-400/40",
    dotBg: "bg-amber-400",
    labelPt: "Em Análise",
  },
  approved: {
    bg: "bg-emerald-950/80",
    border: "border-emerald-500/50",
    text: "text-emerald-400",
    ring: "ring-emerald-500/40",
    dotBg: "bg-emerald-500",
    labelPt: "Verificado ✓",
  },
};

const DOCUMENT_TITLES: Record<DocumentTypeKey, string> = {
  identity: "Documento de Identidade",
  selfie: "Biometria Facial",
  address: "Comprovante de Residência",
  pix: "Chave PIX",
  school_history: "Histórico Escolar",
  civil_certificate: "Certidão Civil",
  voter_card: "Título Eleitoral",
  military_certificate: "Certificado Militar",
  contract: "Contrato Digital",
};

/**
 * DutyIconBadge — compact reactive status icon indicator for navigation headers,
 * cockpit overviews, candidate/student lists, and table rows.
 */
export function DutyIconBadge({
  documentType,
  status,
  size = "md",
  label,
  showRing = true,
  showDot = true,
  showTooltip = true,
  pulseOnAnalyzing = true,
  onClick,
  className = "",
  disabled = false,
  item,
}: DutyIconBadgeProps) {
  const IconComponent = DOCUMENT_ICONS[documentType] || IconFileText;
  const sizeConfig = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const statusConfig = STATUS_CONFIGS[status] || STATUS_CONFIGS.empty;

  const docTitle = item?.title || DOCUMENT_TITLES[documentType] || "Documento";
  const tooltipText = label || `${docTitle}: ${statusConfig.labelPt}`;

  const isInteractive = Boolean(onClick && !disabled);
  const isAnalyzing = status === "analyzing";

  const content = (
    <div
      className={`relative inline-flex items-center justify-center border transition-all duration-200 select-none ${
        sizeConfig.container
      } ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} ${
        showRing ? `ring-1 ${statusConfig.ring}` : ""
      } ${
        isAnalyzing && pulseOnAnalyzing ? "animate-pulse" : ""
      } ${className}`}
    >
      {isAnalyzing ? (
        <IconLoader2 className={`${sizeConfig.icon} animate-spin`} />
      ) : (
        <IconComponent className={sizeConfig.icon} />
      )}

      {/* Reactive Status Dot */}
      {showDot && (
        <span
          className={`absolute rounded-full ring-slate-900 ${sizeConfig.dot} ${statusConfig.dotBg} ${
            isAnalyzing ? "animate-ping" : ""
          }`}
          aria-hidden="true"
        />
      )}
    </div>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={showTooltip ? tooltipText : undefined}
        aria-label={tooltipText}
        className="group relative inline-flex items-center justify-center p-0.5 rounded-xl transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        {content}
      </button>
    );
  }

  return (
    <span
      title={showTooltip ? tooltipText : undefined}
      aria-label={tooltipText}
      role="status"
      className="inline-flex items-center justify-center"
    >
      {content}
    </span>
  );
}
