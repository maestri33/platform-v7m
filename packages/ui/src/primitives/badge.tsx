import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-blue text-white shadow hover:bg-brand-blue/80",
        secondary:
          "border-transparent bg-brand-blue-bg text-brand-blue hover:bg-brand-blue-bg/80",
        success:
          "border-transparent bg-brand-green-bg text-brand-green-dark hover:bg-brand-green-bg/80",
        warning:
          "border-transparent bg-brand-amber-bg text-brand-amber hover:bg-brand-amber-bg/80",
        destructive:
          "border-transparent bg-brand-danger-bg text-brand-danger hover:bg-brand-danger-bg/80",
        outline: "text-foreground border-brand-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
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
