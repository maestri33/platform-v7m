"use client";

import type { ReactNode } from "react";

export interface EducationStageCardProps {
  title: string;
  range: string;
  nowRange: string;
  icon: ReactNode;
  themeColor: "green" | "blue" | "accent";
  onClick: () => void;
  disabled?: boolean;
}

export function EducationStageCard({
  title,
  range,
  nowRange,
  icon,
  themeColor,
  onClick,
  disabled = false,
}: EducationStageCardProps) {
  const colorMap = {
    green: {
      border: "hover:border-brand-green/70 border-brand-green/20",
      bg: "hover:bg-brand-green-bg/60",
      iconBg: "bg-brand-green-bg text-brand-green-dark",
      badgeBg: "bg-brand-green-bg text-brand-green-dark",
    },
    blue: {
      border: "hover:border-brand-blue-bright/70 border-brand-blue-bright/20",
      bg: "hover:bg-brand-blue-bg/60",
      iconBg: "bg-brand-blue-bg text-brand-blue",
      badgeBg: "bg-brand-blue-bg text-brand-blue",
    },
    accent: {
      border: "hover:border-brand-yellow-dark/70 border-brand-yellow-dark/20",
      bg: "hover:bg-brand-yellow-bg/60",
      iconBg: "bg-brand-yellow-bg text-brand-yellow-dark",
      badgeBg: "bg-brand-yellow-bg text-brand-yellow-dark",
    },
  };

  const theme = colorMap[themeColor] || colorMap.green;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex w-full cursor-pointer items-center gap-4 rounded-[22px] border-[1.5px] bg-white/80 p-4 text-left shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${theme.border} ${theme.bg}`}
    >
      <div
        className={`flex size-14 shrink-0 items-center justify-center rounded-[16px] transition-transform duration-200 group-hover:scale-105 ${theme.iconBg}`}
      >
        {icon}
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        <h3 className="text-lg font-extrabold text-brand-ink transition-colors group-hover:text-brand-ink">
          {title}
        </h3>
        <p className="text-sm font-semibold text-brand-ink/80">{range}</p>
        <span
          className={`mt-0.5 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${theme.badgeBg}`}
        >
          {nowRange}
        </span>
      </div>

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
    </button>
  );
}
