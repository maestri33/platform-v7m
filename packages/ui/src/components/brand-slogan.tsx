export interface BrandSloganProps {
  text: string;
  showBars?: boolean;
  className?: string;
}

export function BrandSlogan({
  text,
  showBars = true,
  className = "",
}: BrandSloganProps) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
      <p className="text-xs font-extrabold tracking-[0.15em] text-brand-green-light [text-shadow:0_1px_10px_rgba(2,8,23,0.65)]">
        {text}
      </p>
      {showBars && (
        <div aria-hidden className="flex justify-center gap-1.5">
          <span className="h-1.5 w-7 rounded-full bg-brand-green" />
          <span className="h-1.5 w-7 rounded-full bg-brand-yellow" />
          <span className="h-1.5 w-7 rounded-full bg-brand-blue" />
        </div>
      )}
    </div>
  );
}
