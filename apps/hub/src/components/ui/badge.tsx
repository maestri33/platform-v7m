import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-blue text-white",
        secondary:
          "border-transparent bg-brand-blue-bg text-brand-blue font-medium",
        success:
          "border-transparent bg-brand-green-bg text-brand-green-dark",
        destructive:
          "border-transparent bg-brand-danger-bg text-brand-danger",
        warning:
          "border-transparent bg-brand-amber-bg text-brand-amber",
        outline:
          "border border-brand-border bg-white text-brand-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
