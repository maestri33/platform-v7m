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
      // A superfície é OPACA de propósito. Este card mora sobre a aurora escura
      // do shell: em `bg-white/70` o fundo composto media ~#b4b9c4 e o corpo do
      // texto (`text-brand-muted`) ficava em 3,0:1 — abaixo do AA. Opaco, todo
      // texto do card herda os mesmos ~5–6:1 medidos no painel (issue #160).
      className={`mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-brand-surface px-5 py-6 text-center ${
        isError ? styles.shake : ""
      } ${
        isError
          ? "border border-brand-danger shadow-[0_12px_34px_-8px_rgba(198,40,40,0.45)]"
          : "border border-brand-border shadow-[var(--shadow-card)]"
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
