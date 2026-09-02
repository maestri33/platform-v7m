"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-brand-blue text-white shadow hover:bg-brand-blue/90",
        primary: "bg-brand-green-dark text-white font-bold hover:bg-brand-green-dark/90 shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-brand-border bg-background shadow-sm hover:bg-muted hover:text-brand-ink",
        secondary:
          "bg-brand-blue-bg text-brand-blue border border-brand-blue/20 hover:bg-brand-blue/10",
        ghost: "hover:bg-muted hover:text-brand-ink",
        link: "text-brand-blue underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "min-h-14 rounded-xl px-5 text-lg font-bold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonOwnProps<T extends React.ElementType = "button"> = {
  as?: T;
  asChild?: boolean;
  loading?: boolean;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
  children?: React.ReactNode;
};

export type ButtonProps<T extends React.ElementType = "button"> = ButtonOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof ButtonOwnProps<T>>;

export function Button<T extends React.ElementType = "button">({
  as,
  asChild = false,
  children,
  loading = false,
  variant = "default",
  size = "default",
  disabled,
  className = "",
  ...rest
}: ButtonProps<T>) {
  const Comp = asChild ? Slot : ((as ?? "button") as React.ElementType);
  const isButton = Comp === "button";
  const isDisabled = !!disabled || loading;

  const buttonProps = isButton
    ? { disabled: isDisabled, "aria-busy": loading || undefined }
    : {};

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...buttonProps}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1"
        />
      )}
      {children}
    </Comp>
  );
}

export { buttonVariants };
