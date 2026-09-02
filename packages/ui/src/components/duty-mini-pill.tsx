"use client";

import * as React from "react";
import { IconLoader2 } from "@tabler/icons-react";
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
    bg: "bg-blue-950/80",
    border: "border-blue-500/50",
    text: "text-blue-400",
    dotBg: "bg-blue-500",
    defaultLabel: "Lendo...",
  },
  needs_kinship: {
    bg: "bg-amber-950/80",
    border: "border-amber-500/50",
    text: "text-amber-400",
    dotBg: "bg-amber-500",
    defaultLabel: "Vínculo Pendente",
  },
  needs_action: {
    bg: "bg-red-950/80",
    border: "border-red-500/50",
    text: "text-red-400",
    dotBg: "bg-red-500",
    defaultLabel: "Ajuste Necessário",
  },
  review: {
    bg: "bg-amber-950/80",
    border: "border-amber-400/50",
    text: "text-amber-300",
    dotBg: "bg-amber-400",
    defaultLabel: "Em Análise",
  },
  approved: {
    bg: "bg-emerald-950/80",
    border: "border-emerald-500/50",
    text: "text-emerald-400",
    dotBg: "bg-emerald-500",
    defaultLabel: "Aprovado ✓",
  },
};

const PILL_SIZES = {
  sm: {
    container: "px-2 py-0.5 text-[10px] font-bold rounded-full gap-1",
    dot: "size-1.5",
    iconSize: "size-3",
  },
  md: {
    container: "px-2.5 py-1 text-xs font-bold rounded-full gap-1.5",
    dot: "size-2",
    iconSize: "size-3.5",
  },
};

/**
 * DutyMiniPill — ultra-compact inline pill for badges, tabs, and list items.
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
        <IconLoader2 className={`${sizeConfig.iconSize} animate-spin text-blue-400 shrink-0`} />
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
