import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { Spinner } from "./spinner";

type Variant = "primary" | "ghost";
type Size = "md" | "xl";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  /** Mostra spinner + desabilita (feedback em submit). */
  loading?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    className = "",
    children,
    ...rest
  } = props as ButtonProps & { className?: string; loading?: boolean };

  const cls = [
    "btn",
    size === "xl" ? "btn-xl" : "",
    variant === "ghost" ? "btn-ghost" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // `rest` ainda contém `href` no caso âncora (não foi desestruturado).
  if ("href" in props && props.href !== undefined) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a href={href} className={cls} {...anchorRest}>
        {children}
      </a>
    );
  }

  const btnRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button {...btnRest} className={cls} disabled={btnRest.disabled || loading}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}
