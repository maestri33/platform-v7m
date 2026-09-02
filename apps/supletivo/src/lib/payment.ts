import { formatBRL } from "@/lib/money";

export type PaymentMethod = "pix" | "card";

export interface CardPricing {
  installments: number;
  installment: string;
  total: string;
}

/** Shape of GET /api/v1/clients/pricing. */
export interface Pricing {
  pix: string;
  card: CardPricing;
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix à vista",
  card: "Cartão de crédito",
};

/** Validate a raw query value into a known payment method (else null). */
export function parsePaymentMethod(raw: string | null | undefined): PaymentMethod | null {
  return raw === "pix" || raw === "card" ? raw : null;
}

/** Short price line, e.g. "R$ 999,00 à vista" or "12× de R$ 99,00". */
export function priceLine(method: PaymentMethod, pricing: Pricing): string {
  if (method === "pix") return `${formatBRL(pricing.pix)} à vista`;
  return `${pricing.card.installments}× de ${formatBRL(pricing.card.installment)}`;
}
