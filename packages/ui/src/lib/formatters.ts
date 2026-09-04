/**
 * Brazilian input formatting & validation helpers.
 */

/** Strip everything but digits. */
export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

/** Progressive display mask: 000.000.000-00 */
export function maskCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Full CPF validation: 11 digits, not all equal, both check digits. */
export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const digit = (sliceLen: number, startWeight: number): number => {
    let sum = 0;
    for (let i = 0; i < sliceLen; i++) sum += Number(d[i]) * (startWeight - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  return digit(9, 10) === Number(d[9]) && digit(10, 11) === Number(d[10]);
}

/** Backend contract: 10 or 11 digits (DDD + number). */
export function isValidBrPhone(value: string): boolean {
  const d = onlyDigits(value);
  return d.length === 10 || d.length === 11;
}

/**
 * Progressive mask for display while typing.
 * 11 digits -> (00) 00000-0000 · 10 digits -> (00) 0000-0000
 */
export function maskBrPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const breakAt = rest.length > 8 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, breakAt)}-${rest.slice(breakAt)}`;
}

/** Format a decimal string/number as Brazilian currency. "999.00" -> "R$ 999,00". */
export function formatBRL(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
