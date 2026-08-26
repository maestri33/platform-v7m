import type { ReactNode } from "react";
import Link from "next/link";

type Pad = "sm" | "md" | "lg";

const PAD: Record<Pad, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

/** Cartão estático com suporte a padding e polimorfismo (estilo Creative Tim / liquid glass). */
export function Card({
  children,
  pad,
  className = "",
  ...rest
}: {
  children: ReactNode;
  pad?: Pad;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const padCls = pad ? PAD[pad] : "";
  return (
    <div className={`card ${padCls} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

/** Cartão clicável — hover dourado + foco visível. `external` abre em nova aba. */
export function CardLink({
  href,
  children,
  className = "",
  external = false,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
}) {
  const cls = `card card-interactive block ${className}`.trim();
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
