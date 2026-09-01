import type { ReactNode } from "react";

export interface TrustBadgeItem {
  label: string;
  icon: ReactNode;
}

export interface TrustBadgesProps {
  items: TrustBadgeItem[];
  className?: string;
}

export function TrustBadges({ items, className = "" }: TrustBadgesProps) {
  return (
    <ul
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-white/70 px-2 ${className}`}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1 shrink-0">
          <svg
            className="size-3.5 shrink-0 text-brand-green-light"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {item.icon}
          </svg>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
