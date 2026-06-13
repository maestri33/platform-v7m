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
      <select
        id={selectId}
        className={`min-h-14 appearance-none rounded-xl border border-brand-border bg-brand-surface px-4 text-lg text-brand-ink outline-none transition focus:border-brand-blue-bright focus:ring-2 focus:ring-brand-blue-bright/40 ${className}`}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
