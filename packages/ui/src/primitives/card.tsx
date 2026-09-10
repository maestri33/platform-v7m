"use client";

import * as React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "../lib/utils";

// ─── 3D Card Context (Aceternity Parity) ───────────────────────────────────────

const MouseEnterContext = createContext<
  [boolean, React.Dispatch<React.SetStateAction<boolean>>] | undefined
>(undefined);

export const useMouseEnter = () => {
  const context = useContext(MouseEnterContext);
  if (context === undefined) {
    return [false, () => {}] as [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  }
  return context;
};

export const useCardHover = () => {
  const [isMouseEntered, setIsMouseEntered] = useMouseEnter();
  return { isMouseEntered, setIsMouseEntered };
};

// ─── Core Card Types & Styling ───────────────────────────────────────────────

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
    "rounded-2xl border border-brand-border/80 bg-brand-surface text-brand-ink shadow-[var(--shadow-card)] transition-all duration-300",
  elevated:
    "rounded-2xl border border-brand-border bg-white text-brand-ink shadow-[0_12px_40px_-12px_rgba(11,27,59,0.25)] transition-all duration-300",
  subtle:
    "rounded-xl border border-brand-border/60 bg-brand-surface-subtle/50 text-brand-ink transition-all duration-300",
  dark:
    "rounded-2xl border border-white/15 bg-brand-ink text-white shadow-xl transition-all duration-300",
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

export type CardOwnProps<T extends ElementType = "div"> = {
  as?: T;
  pad?: Pad;
  variant?: CardVariant;
  className?: string;
  style?: React.CSSProperties | string;
  children?: ReactNode;
  /** Ativa o efeito 3D parallax ao passar o cursor (Aceternity 3D Card) */
  tilt?: boolean;
  /** Intensidade da rotação 3D. Padrão: 25 */
  tiltFactor?: number;
  /** Classes CSS adicionais do container de perspectiva externa (quando tilt=true) */
  containerClassName?: string;
};

export type CardProps<T extends ElementType = "div"> = CardOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof CardOwnProps<T>>;

// ─── Aceternity Compatible Primitives ────────────────────────────────────────

export interface CardContainerProps {
  children?: ReactNode;
  className?: string;
  containerClassName?: string;
  tiltFactor?: number;
}

export const CardContainer = ({
  children,
  className,
  containerClassName,
  tiltFactor = 25,
}: CardContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / tiltFactor;
    const y = (e.clientY - top - height / 2) / tiltFactor;
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
  };

  const handleMouseEnter = () => {
    setIsMouseEntered(true);
    if (!containerRef.current) return;
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    setIsMouseEntered(false);
    containerRef.current.style.transform = `rotateY(0deg) rotateX(0deg)`;
  };

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        className={cn(
          "py-10 flex items-center justify-center",
          containerClassName
        )}
        style={{
          perspective: "1000px",
        }}
      >
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "flex items-center justify-center relative transition-all duration-200 ease-linear",
            className
          )}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
};

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const CardBody = ({
  children,
  className,
  ...props
}: CardBodyProps) => {
  return (
    <div
      className={cn(
        "h-auto w-auto [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export type CardItemProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  className?: string;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export const CardItem = <T extends ElementType = "div">({
  as: Tag = "div" as T,
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}: CardItemProps<T>) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isMouseEntered] = useMouseEnter();

  useEffect(() => {
    if (!ref.current) return;
    if (isMouseEntered) {
      ref.current.style.transform = `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    } else {
      ref.current.style.transform = `translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
    }
  }, [isMouseEntered, translateX, translateY, translateZ, rotateX, rotateY, rotateZ]);

  const Component = Tag as any;

  return (
    <Component
      ref={ref}
      className={cn("w-fit transition duration-200 ease-linear", className)}
      {...rest}
    >
      {children}
    </Component>
  );
};

// ─── Canonical Generic Card Component ────────────────────────────────────────

function Card<T extends ElementType = "div">({
  as,
  pad = "none",
  variant = "default",
  className = "",
  style,
  children,
  tilt = false,
  tiltFactor = 25,
  containerClassName,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const parsed = parseStyle(style);
  const resolvedStyle: React.CSSProperties = {
    ...(tilt ? { transformStyle: "preserve-3d" } : {}),
    ...parsed,
  };

  const baseCard = (
    <Tag
      className={cn(
        VARIANTS[variant],
        PAD[pad],
        tilt && "[transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]",
        className
      )}
      style={resolvedStyle}
      {...rest}
    >
      {children}
    </Tag>
  );

  if (tilt) {
    return (
      <CardContainer containerClassName={containerClassName} tiltFactor={tiltFactor}>
        {baseCard}
      </CardContainer>
    );
  }

  return baseCard;
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]", className)}
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
      "text-xl font-bold leading-none tracking-tight text-brand-ink [transform-style:preserve-3d]",
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
    className={cn("text-sm text-brand-muted [transform-style:preserve-3d]", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pt-0 [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0 [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
