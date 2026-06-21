"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./button.module.css";

type Variant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-green-dark text-white hover:bg-[#006a27]",
  secondary:
    "bg-transparent text-brand-blue border-2 border-brand-blue hover:bg-brand-blue/5 hover:-translate-y-0.5 active:scale-[0.99]",
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
  const shiny = variant === "primary" && !isDisabled ? styles.shiny : "";
  return (
    <button
      disabled={isDisabled}
      aria-busy={loading}
      className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-5 text-lg font-bold tracking-tight transition disabled:translate-y-0 disabled:active:scale-100 disabled:cursor-not-allowed disabled:bg-brand-border disabled:text-brand-muted disabled:shadow-none ${VARIANTS[variant]} ${shiny} ${className}`}
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
