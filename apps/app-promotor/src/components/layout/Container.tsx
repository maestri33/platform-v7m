import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
};

export function Container({ children, narrow = false, className = "" }: ContainerProps) {
  const cls = ["container-x", narrow ? "max-w-3xl mx-auto" : "", className].filter(Boolean).join(" ");
  return <div className={cls}>{children}</div>;
}
