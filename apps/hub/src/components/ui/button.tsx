import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-brand-blue text-white shadow-sm hover:bg-[#01184d] hover:shadow",
        action:
          "bg-brand-green text-white shadow-sm hover:bg-brand-green-dark hover:shadow",
        destructive:
          "bg-brand-danger text-white shadow-sm hover:bg-[#a51d1d] hover:shadow",
        outline:
          "border border-brand-border bg-white text-brand-ink shadow-xs hover:bg-brand-bg hover:border-[#b4bccd]",
        secondary:
          "bg-brand-blue-bg text-brand-blue hover:bg-[#d8e4f8]",
        ghost:
          "text-brand-ink hover:bg-brand-blue-bg/60 hover:text-brand-blue",
        link:
          "text-brand-blue underline-offset-4 hover:underline p-0 h-auto font-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
