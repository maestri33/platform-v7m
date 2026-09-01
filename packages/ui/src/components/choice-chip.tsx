"use client";

import { type ReactNode } from "react";

export type ChoiceChipVariant = "blue" | "green" | "accent" | "neutral";
export type ChoiceChipSize = "sm" | "md";

export interface ChoiceChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  variant?: ChoiceChipVariant;
  size?: ChoiceChipSize;
  className?: string;
}

const VARIANT_SELECTED_STYLES: Record<ChoiceChipVariant, string> = {
  blue: "bg-brand-blue text-white shadow-sm border-brand-blue",
  green: "bg-brand-green text-white shadow-sm border-brand-green",
  accent: "bg-brand-accent text-white shadow-sm border-brand-accent",
  neutral: "bg-brand-ink text-white shadow-sm border-brand-ink",
};

const VARIANT_UNSELECTED_STYLES: Record<ChoiceChipVariant, string> = {
  blue: "border-brand-border bg-white text-brand-ink hover:border-brand-blue/40 hover:bg-brand-blue/5",
  green: "border-brand-border bg-white text-brand-ink hover:border-brand-green/40 hover:bg-brand-green/5",
  accent: "border-brand-border bg-white text-brand-ink hover:border-brand-accent/40 hover:bg-brand-accent/5",
  neutral: "border-brand-border bg-white text-brand-ink hover:border-brand-ink/30 hover:bg-black/5",
};

const SIZE_STYLES: Record<ChoiceChipSize, string> = {
  sm: "px-3 py-1 text-[12px]",
  md: "px-3.5 py-1.5 text-[13px]",
};

export function ChoiceChip({
  label,
  selected = false,
  onClick,
  disabled = false,
  icon,
  variant = "blue",
  size = "md",
  className = "",
}: ChoiceChipProps) {
  const selectedStyle = VARIANT_SELECTED_STYLES[variant];
  const unselectedStyle = VARIANT_UNSELECTED_STYLES[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 disabled:opacity-50 disabled:pointer-events-none ${
        SIZE_STYLES[size]
      } ${selected ? selectedStyle : unselectedStyle} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

export interface ChoiceChipGroupProps {
  options: string[] | Array<{ id: string; label: string; icon?: ReactNode }>;
  value?: string | null;
  onChange: (value: string) => void;
  variant?: ChoiceChipVariant;
  size?: ChoiceChipSize;
  className?: string;
  disabled?: boolean;
}

export function ChoiceChipGroup({
  options,
  value,
  onChange,
  variant = "blue",
  size = "md",
  className = "",
  disabled = false,
}: ChoiceChipGroupProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((opt) => {
        const id = typeof opt === "string" ? opt : opt.id;
        const label = typeof opt === "string" ? opt : opt.label;
        const icon = typeof opt === "string" ? undefined : opt.icon;
        const isSelected = value === id;

        return (
          <ChoiceChip
            key={id}
            label={label}
            icon={icon}
            selected={isSelected}
            onClick={() => onChange(id)}
            variant={variant}
            size={size}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}
