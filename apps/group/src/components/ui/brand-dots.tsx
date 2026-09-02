type Size = "sm" | "md";

interface BrandDotsProps {
  /** "sm" = h-1 w-5 (login/register/planos), "md" = h-1.5 w-7 (home/painel). */
  size?: Size;
  /** Center the row (login/register/planos use a centered stripe). */
  center?: boolean;
  className?: string;
}

const BAR: Record<Size, string> = {
  sm: "h-1 w-5",
  md: "h-1.5 w-7",
};

/**
 * As três barrinhas da bandeira (verde/amarelo/azul) — a assinatura visual
 * repetida no topo das telas do funil. Extraída pra um só lugar; `size` cobre
 * as duas escalas em uso e `center` o alinhamento centralizado das telas de
 * cartão. O azul usa brand-blue-bright nos cards claros (login/register/planos)
 * e brand-blue nos fundos claros maiores (home/painel) — mantido por `size`.
 */
export function BrandDots({ size = "md", center = false, className = "" }: BrandDotsProps) {
  const blue = size === "sm" ? "bg-brand-blue-bright" : "bg-brand-blue";
  return (
    <div
      aria-hidden
      className={`flex gap-1.5 ${center ? "justify-center" : ""} ${className}`}
    >
      <span className={`${BAR[size]} rounded-full bg-brand-green`} />
      <span className={`${BAR[size]} rounded-full bg-brand-yellow`} />
      <span className={`${BAR[size]} rounded-full ${blue}`} />
    </div>
  );
}
