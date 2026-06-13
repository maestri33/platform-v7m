"use client";

import { useId, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  invalid?: boolean;
}

export function TextField({
  label,
  hint,
  invalid = false,
  id,
  className = "",
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[15px] font-bold text-brand-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={invalid}
        aria-describedby={hintId}
        className={`min-h-14 rounded-xl border bg-brand-surface px-4 text-xl text-brand-ink outline-none transition placeholder:text-brand-muted focus:ring-2 focus:ring-brand-blue-bright/40 disabled:bg-brand-bg disabled:text-brand-muted ${
          invalid ? "border-brand-danger" : "border-brand-border focus:border-brand-blue-bright"
        } ${className}`}
        {...rest}
      />
      {hint ? (
        <p id={hintId} className={`text-[13px] ${invalid ? "text-brand-danger" : "text-brand-muted"}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
