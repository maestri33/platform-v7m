"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-green text-white hover:bg-brand-green-dark active:scale-[0.99]",
  secondary:
    "bg-transparent text-brand-blue border-2 border-brand-blue hover:bg-brand-blue/5 active:scale-[0.99]",
};

export function Button({
  children,
  loading = false,
  variant = "primary",
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      disabled={isDisabled}
      aria-busy={loading}
      className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-5 text-lg font-bold tracking-tight transition disabled:opacity-50 disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
