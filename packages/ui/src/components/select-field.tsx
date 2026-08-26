"use client";

import { useId, type SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({
  label,
  options,
  placeholder = "Selecione…",
  id,
  className = "",
  ...rest
}: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={selectId} className="text-[15px] font-bold text-brand-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className={`min-h-14 w-full cursor-pointer appearance-none rounded-xl border-2 border-brand-border bg-white/55 px-4 pr-11 text-lg text-brand-ink outline-none backdrop-blur-md transition-all hover:border-brand-border/90 hover:bg-white/70 focus:border-brand-blue-bright focus:bg-white/90 focus:ring-4 focus:ring-brand-blue-bright/25 disabled:cursor-not-allowed disabled:bg-brand-bg disabled:text-brand-muted ${className}`}
          {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-brand-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
