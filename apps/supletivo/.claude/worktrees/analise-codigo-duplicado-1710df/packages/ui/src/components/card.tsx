import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type Pad = "sm" | "md" | "lg";

const PAD: Record<Pad, string> = {
  sm: "p-5",
  md: "p-6",
  lg: "p-7",
};

/**
 * Superfície única do funil — "liquid glass": vidro fosco com realce de luz no
 * topo (a assinatura do efeito), borda translúcida e elevação suave. Inspirado
 * no liquid-glass do ui-layouts, mas sem a dependência de animação/arraste — só
 * o material. Polimórfica (`as`) porque o mesmo card é <form> na home/cadastro,
 * <section> no wizard e <div> no painel/login. `pad` controla o respiro interno.
 */
const GLASS =
  "rounded-[28px] border border-white/50 bg-white/70 backdrop-blur-xl " +
  "shadow-[0_10px_34px_-10px_rgba(11,27,59,0.25),inset_0_1px_0_rgba(255,255,255,0.7)]";

type CardOwnProps<T extends ElementType> = {
  as?: T;
  pad?: Pad;
  className?: string;
  children?: ReactNode;
};

type CardProps<T extends ElementType> = CardOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof CardOwnProps<T>>;

export function Card<T extends ElementType = "div">({
  as,
  pad = "md",
  className = "",
  children,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={`${GLASS} ${PAD[pad]} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
