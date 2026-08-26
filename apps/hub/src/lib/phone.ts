export function digitsOnly(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

export function formatPhoneBR(value: string | null | undefined): string {
  const digits = digitsOnly(value).replace(/^55(?=\d{10,11}$)/, "");
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function isValidPhoneBR(value: string | null | undefined): boolean {
  const digits = digitsOnly(value).replace(/^55(?=\d{10,11}$)/, "");
  return digits.length === 10 || digits.length === 11;
}
