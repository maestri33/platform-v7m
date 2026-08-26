export function formatBRLFromCents(cents: number): string {
  if (!cents || cents < 0) return '';
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  return `${reais.toLocaleString('pt-BR')},${centavos.toString().padStart(2, '0')}`;
}

export function parseBRLToCents(input: string): number {
  const cleaned = input
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const number = Number.parseFloat(cleaned);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number * 100);
}
