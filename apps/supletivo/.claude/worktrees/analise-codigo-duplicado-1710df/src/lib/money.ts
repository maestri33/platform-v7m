/** Format a decimal string/number as Brazilian currency. "999.00" -> "R$ 999,00". */
export function formatBRL(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
