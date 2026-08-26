/** Métrica em cartão (total/pendente/pago/média). */
export function Stat({
  label,
  value,
  size = "lg",
}: {
  label: string;
  value: string;
  size?: "lg" | "xl";
}) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-[var(--surface-text-muted)]">{label}</p>
      <p className={`font-display mt-1 ${size === "xl" ? "text-3xl" : "text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}
