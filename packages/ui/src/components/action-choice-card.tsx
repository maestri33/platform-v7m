"use client";

import type { ReactNode } from "react";

export type ActionChoiceTheme =
  | "green"
  | "blue"
  | "accent"
  | "danger"
  | "neutral";

export interface ActionChoiceCardProps {
  title: string;
  subtitle?: string;
  hint?: string;
  badge?: string;
  icon?: ReactNode;
  themeColor?: ActionChoiceTheme;
  selected?: boolean;
  rightSlot?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const THEME_MAP: Record<
  ActionChoiceTheme,
  {
    border: string;
    bgHover: string;
    iconBg: string;
    badgeBg: string;
    selectedBorder: string;
    selectedBg: string;
  }
> = {
  green: {
    border: "border-brand-green/20 hover:border-brand-green/70",
    bgHover: "hover:bg-brand-green-bg/50",
    iconBg: "bg-brand-green-bg text-brand-green-dark",
    badgeBg: "bg-brand-green-bg text-brand-green-dark",
    selectedBorder: "border-brand-green ring-2 ring-brand-green/20",
    selectedBg: "bg-brand-green-bg/70",
  },
  blue: {
    border: "border-brand-blue-bright/20 hover:border-brand-blue-bright/70",
    bgHover: "hover:bg-brand-blue-bg/50",
    iconBg: "bg-brand-blue-bg text-brand-blue",
    badgeBg: "bg-brand-blue-bg text-brand-blue",
    selectedBorder: "border-brand-blue-bright ring-2 ring-brand-blue-bright/20",
    selectedBg: "bg-brand-blue-bg/70",
  },
  accent: {
    border: "border-brand-yellow-dark/20 hover:border-brand-yellow-dark/70",
    bgHover: "hover:bg-brand-yellow-bg/50",
    iconBg: "bg-brand-yellow-bg text-brand-yellow-dark",
    badgeBg: "bg-brand-yellow-bg text-brand-yellow-dark",
    selectedBorder: "border-brand-yellow-dark ring-2 ring-brand-yellow-dark/20",
    selectedBg: "bg-brand-yellow-bg/70",
  },
  danger: {
    border: "border-brand-danger/20 hover:border-brand-danger/70",
    bgHover: "hover:bg-brand-danger-bg/50",
    iconBg: "bg-brand-danger-bg text-brand-danger",
    badgeBg: "bg-brand-danger-bg text-brand-danger",
    selectedBorder: "border-brand-danger ring-2 ring-brand-danger/20",
    selectedBg: "bg-brand-danger-bg/70",
  },
  neutral: {
    border: "border-brand-border hover:border-brand-blue-bright/70",
    bgHover: "hover:bg-white/90",
    iconBg: "bg-brand-border/40 text-brand-ink",
    badgeBg: "bg-brand-border/40 text-brand-muted",
    selectedBorder: "border-brand-ink ring-2 ring-brand-ink/10",
    selectedBg: "bg-brand-border/20",
  },
};

export function ActionChoiceCard({
  title,
  subtitle,
  hint,
  badge,
  icon,
  themeColor = "blue",
  selected = false,
  rightSlot,
  onClick,
  disabled = false,
  className = "",
}: ActionChoiceCardProps) {
  const theme = THEME_MAP[themeColor] || THEME_MAP.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex w-full cursor-pointer items-center gap-4 rounded-[22px] border-[1.5px] bg-white/80 p-4 text-left shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${
        selected ? `${theme.selectedBorder} ${theme.selectedBg}` : `${theme.border} ${theme.bgHover}`
      } ${className}`}
    >
      {icon && (
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-[16px] transition-transform duration-200 group-hover:scale-105 ${theme.iconBg}`}
        >
          {icon}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-extrabold text-brand-ink transition-colors">
            {title}
          </h3>
          {badge && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${theme.badgeBg}`}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm font-semibold text-brand-ink/80">{subtitle}</p>
        )}
        {hint && (
          <span className="text-xs font-medium text-brand-muted">{hint}</span>
        )}
      </div>

      {rightSlot ? (
        rightSlot
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-border/40 text-brand-muted transition-colors group-hover:bg-brand-ink group-hover:text-white">
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      )}
    </button>
  );
}
