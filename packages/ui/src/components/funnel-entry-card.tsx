"use client";

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import styles from "./funnel-entry-card.module.css";

export interface FunnelEntryCardProps<T extends ElementType = "div"> {
  as?: T;
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  error?: boolean;
  shake?: boolean;
  className?: string;
}

type CombinedProps<T extends ElementType> = FunnelEntryCardProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof FunnelEntryCardProps<T>>;

export function FunnelEntryCard<T extends ElementType = "div">({
  as,
  header,
  children,
  footer,
  error = false,
  shake = false,
  className = "",
  ...rest
}: CombinedProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const isError = error || shake;

  return (
    <Tag
      data-error={isError ? "true" : undefined}
      className={`mx-auto flex w-full max-w-[360px] flex-col items-center gap-3.5 rounded-[28px] bg-white/70 px-5 py-6 text-center backdrop-blur-xl ${
        isError ? styles.shake : ""
      } ${
        isError
          ? "border-[1.5px] border-brand-danger/65 shadow-[0_12px_34px_-8px_rgba(198,40,40,0.45),inset_0_1px_0_rgba(255,255,255,0.7)]"
          : "border border-white/50 shadow-[0_10px_34px_-10px_rgba(11,27,59,0.25),inset_0_1px_0_rgba(255,255,255,0.7)]"
      } ${className}`}
      {...rest}
    >
      {header}
      {header && <div aria-hidden className="h-px w-full bg-brand-border opacity-70" />}
      {children}
      {footer && <div aria-hidden className="h-px w-full bg-brand-border opacity-70" />}
      {footer}
    </Tag>
  );
}
