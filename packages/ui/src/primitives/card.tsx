import * as React from "react";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "../lib/utils";

type Pad = "none" | "xs" | "sm" | "md" | "lg";
type CardVariant = "default" | "elevated" | "subtle" | "dark";

const PAD: Record<Pad, string> = {
  none: "",
  xs: "p-3",
  sm: "p-5",
  md: "p-6",
  lg: "p-7",
};

const VARIANTS: Record<CardVariant, string> = {
  default:
    "rounded-2xl border border-brand-border/80 bg-brand-surface text-brand-ink shadow-[var(--shadow-card)] transition-shadow",
  elevated:
    "rounded-2xl border border-brand-border bg-white text-brand-ink shadow-[0_12px_40px_-12px_rgba(11,27,59,0.25)] transition-shadow",
  subtle:
    "rounded-xl border border-brand-border/60 bg-brand-surface-subtle/50 text-brand-ink",
  dark:
    "rounded-2xl border border-white/15 bg-brand-ink text-white shadow-xl",
};

function parseStyle(style?: React.CSSProperties | string): React.CSSProperties | undefined {
  if (!style) return undefined;
  if (typeof style !== "string") return style;

  const res: Record<string, string> = {};
  for (const rule of style.split(";")) {
    const trimmed = rule.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > -1) {
      const prop = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim();
      if (prop && val) {
        res[prop] = val;
      }
    }
  }
  return res as React.CSSProperties;
}

type CardOwnProps<T extends ElementType> = {
  as?: T;
  pad?: Pad;
  variant?: CardVariant;
  className?: string;
  style?: React.CSSProperties | string;
  children?: ReactNode;
};

type CardProps<T extends ElementType> = CardOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof CardOwnProps<T>>;

function Card<T extends ElementType = "div">({
  as,
  pad = "none",
  variant = "default",
  className = "",
  style,
  children,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const resolvedStyle = parseStyle(style);

  return (
    <Tag
      className={cn(VARIANTS[variant], PAD[pad], className)}
      style={resolvedStyle}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-xl font-bold leading-none tracking-tight text-brand-ink",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-brand-muted", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
