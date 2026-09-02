import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type LiquidGlassProps<T extends ElementType = "div"> = {
  as?: T;
  cornerRadius?: number;
  displacementScale?: number;
  blurAmount?: number;
  saturation?: number;
  showBorders?: boolean;
  showHoverEffect?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/**
 * Superfície translúcida LiquidGlass com refração óptica e suporte a Server Components.
 */
export function LiquidGlass<T extends ElementType = "div">({
  as,
  cornerRadius,
  displacementScale,
  blurAmount,
  saturation,
  showBorders = true,
  showHoverEffect = false,
  className = "",
  children,
  ...props
}: LiquidGlassProps<T>) {
  const Component = as || "div";
  return (
    <Component
      className={`backdrop-blur-xl bg-brand-ink/40 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
