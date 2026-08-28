"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import type { DocumentStatus } from "./duty-status-card";

export interface DutyMiniPillProps {
  /** Current document status */
  status: DocumentStatus;
  /** Pill size variant */
  size?: "sm" | "md";
  /** Optional custom text label */
  label?: string;
  /** Whether to render the leading status indicator dot */
  showDot?: boolean;
  /** Optional custom icon */
  icon?: React.ReactNode;
  /** Optional click handler */
  onClick?: () => void;
  /** Additional CSS class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

const PILL_STATUS_CONFIGS: Record<
  DocumentStatus,
  {
    bg: string;
    border: string;
    text: string;
    dotBg: string;
    defaultLabel: string;
  }
> = {
  empty: {
    bg: "bg-slate-800/90",
    border: "border-slate-700",
    text: "text-slate-300",
    dotBg: "bg-slate-400",
    defaultLabel: "Pendente",
  },
  analyzing: {
    bg: "bg-blue-500/15",
    border: "border-blue-500/40",
    text: "text-blue-300",
    dotBg: "bg-blue-400",
    defaultLabel: "Lendo (OCR)...",
  },
  needs_kinship: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-300",
    dotBg: "bg-amber-400",
    defaultLabel: "Vínculo Pendente",
  },
  needs_action: {
    bg: "bg-red-500/15",
    border: "border-red-500/40",
    text: "text-red-300",
    dotBg: "bg-red-400",
    defaultLabel: "Ajuste Necessário",
  },
  review: {
    bg: "bg-amber-400/15",
    border: "border-amber-400/40",
    text: "text-amber-200",
    dotBg: "bg-amber-400",
    defaultLabel: "Em Análise",
  },
  approved: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
    text: "text-emerald-300",
    dotBg: "bg-emerald-400",
    defaultLabel: "Verificado ✓",
  },
};

const PILL_SIZES = {
  sm: {
    container: "text-[10px] px-2 py-0.5 font-bold gap-1 rounded-full",
    dot: "size-1.5",
    iconSize: "size-3",
  },
  md: {
    container: "text-xs px-2.5 py-1 font-bold gap-1.5 rounded-full",
    dot: "size-2",
    iconSize: "size-3.5",
  },
};

/**
 * DutyMiniPill — compact status pill badge with indicator dot and localized PT-BR label.
 */
export function DutyMiniPill({
  status,
  size = "md",
  label,
  showDot = true,
  icon,
  onClick,
  className = "",
  disabled = false,
}: DutyMiniPillProps) {
  const config = PILL_STATUS_CONFIGS[status] || PILL_STATUS_CONFIGS.empty;
  const sizeConfig = PILL_SIZES[size] || PILL_SIZES.md;
  const displayText = label || config.defaultLabel;
  const isAnalyzing = status === "analyzing";
  const isInteractive = Boolean(onClick && !disabled);

  const innerContent = (
    <>
      {icon ? (
        <span className="shrink-0">{icon}</span>
      ) : isAnalyzing ? (
        <Loader2 className={`${sizeConfig.iconSize} animate-spin text-blue-400 shrink-0`} />
      ) : showDot ? (
        <span
          className={`shrink-0 rounded-full ${sizeConfig.dot} ${config.dotBg}`}
          aria-hidden="true"
        />
      ) : null}

      <span className="truncate leading-none uppercase tracking-wider">{displayText}</span>
    </>
  );

  const baseClasses = `inline-flex items-center border transition-all select-none ${sizeConfig.container} ${config.bg} ${config.border} ${config.text} ${
    isAnalyzing ? "animate-pulse" : ""
  } ${className}`;

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} hover:opacity-90 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue/40 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {innerContent}
      </button>
    );
  }

  return <span className={baseClasses}>{innerContent}</span>;
}
