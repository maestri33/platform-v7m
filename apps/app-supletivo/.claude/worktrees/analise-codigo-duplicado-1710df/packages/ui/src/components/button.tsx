"use client";

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import styles from "./button.module.css";

type Variant = "primary" | "secondary";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-green-dark text-white hover:bg-[var(--color-green-hover)]",
  secondary:
    "bg-transparent text-brand-blue border-2 border-brand-blue hover:bg-brand-blue/5 hover:-translate-y-0.5 active:scale-[0.99]",
};

const BASE =
  "flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-lg font-bold tracking-tight transition";

const DISABLED =
  "disabled:translate-y-0 disabled:active:scale-100 disabled:cursor-not-allowed disabled:bg-brand-border disabled:text-brand-muted disabled:shadow-none";

type ButtonOwnProps<T extends ElementType> = {
  /** Render as another element (e.g. Link, "a") with identical styling. */
  as?: T;
  children: ReactNode;
  loading?: boolean;
  variant?: Variant;
  className?: string;
};

type ButtonProps<T extends ElementType> = ButtonOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof ButtonOwnProps<T>>;

/**
 * CTA do funil — "liquid glass" verde com brilho (primary) ou contorno azul
 * (secondary). Polimórfica (`as`, espelhando o card): renderiza <button> por
 * padrão, mas também <a>/<Link> com o MESMO estilo + min-h-14, pra que os CTAs
 * em forma de link parem de ser remarcados à mão. `loading` só faz sentido no
 * <button> (mostra o spinner e seta aria-busy/disabled).
 */
export function Button<T extends ElementType = "button">({
  as,
  children,
  loading = false,
  variant = "primary",
  disabled,
  className = "",
  ...rest
}: ButtonProps<T>) {
  const Tag = (as ?? "button") as ElementType;
  const isButton = Tag === "button";
  const isDisabled = !!disabled || loading;
  const shiny = variant === "primary" && !isDisabled ? styles.shiny : "";
  const classes = `${BASE} ${isButton ? DISABLED : ""} ${VARIANTS[variant]} ${shiny} ${className}`;

  // Props that only make sense (or only type-check) on a native <button>.
  const buttonProps = isButton
    ? { disabled: isDisabled, "aria-busy": loading || undefined }
    : {};

  return (
    <Tag className={classes} {...buttonProps} {...rest}>
      {loading && (
        <span
          aria-hidden
          className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </Tag>
  );
}
