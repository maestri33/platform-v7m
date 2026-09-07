/**
 * Fonte única de preço da landing.
 *
 * Buscado no BACKEND em build-time (site é estático: o preço é embutido no
 * HTML e no schema JSON-LD, sem JS no cliente, sem CLS). Trocar o preço de
 * produção = novo deploy.
 *
 * Resiliência: se a API falhar, demorar, ou devolver valor implausível
 * (ex.: dados de teste em centavos), caímos no FALLBACK com os valores reais
 * atuais — o site nunca exibe preço quebrado. "Nunca confie em dado externo."
 *
 * Resposta esperada do endpoint:
 *   { "pix": "999.00", "card": { "installments": 12, "installment": "99.00", "total": "1188.00" } }
 * O "valor cheio" (âncora riscada "de R$ X") NÃO vem do backend de pricing —
 * é referência de marketing, mantida aqui em ANCHOR_FULL.
 */
const BACKEND_URL =
  import.meta.env.PUBLIC_BACKEND_URL ??
  import.meta.env.BACKEND_URL ??
  (typeof process !== 'undefined'
    ? (process.env?.PUBLIC_BACKEND_URL ?? process.env?.BACKEND_URL)
    : undefined) ??
  (import.meta.env.DEV ? 'http://localhost:8001' : 'https://backend.v7m.live');

const ENDPOINT = `${BACKEND_URL}/api/v1/clients/pricing`;

// âncora de marketing (preço cheio riscado). Fallback caso a API não devolva.
const ANCHOR_FULL = 1615;

export interface Price {
  /** preço cheio, riscado ("de R$ X") — âncora de marketing */
  full: number;
  /** número de parcelas no cartão */
  installments: number;
  /** valor de cada parcela no cartão */
  perMonth: number;
  /** total no cartão (parcelas × valor) */
  cardTotal: number;
  /** total à vista no Pix */
  pixTotal: number;
}

const FALLBACK: Price = {
  full: ANCHOR_FULL,
  installments: 12,
  perMonth: 99,
  cardTotal: 1188,
  pixTotal: 999,
};

async function loadPrice(): Promise<Price> {
  try {
    const res = await fetch(ENDPOINT, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const installments = Number(data?.card?.installments);
    const perMonth = Number(data?.card?.installment);
    const cardTotal = Number(data?.card?.total);
    const pixTotal = Number(data?.pix);
    const anchorFull = Number(data?.anchor_full);
    const full = Number.isFinite(anchorFull) && anchorFull > 0 ? anchorFull : ANCHOR_FULL;

    const numbersOk = [installments, perMonth, cardTotal, pixTotal].every(
      (n) => Number.isFinite(n) && n > 0
    );

    if (!numbersOk) {
      console.warn(
        `[price] backend devolveu valor incompleto — usando fallback. payload=${JSON.stringify(data)}`
      );
      return FALLBACK;
    }

    console.info(
      `[price] preço da API: ${installments}x ${perMonth} | pix ${pixTotal} | total ${cardTotal} | full ${full}`
    );
    return { full, installments, perMonth, cardTotal, pixTotal };
  } catch (err) {
    console.warn(`[price] falha ao buscar pricing da API — usando fallback: ${String(err)}`);
    return FALLBACK;
  }
}

export const PRICE: Price = await loadPrice();

/** economia do Pix vs. preço cheio (>= 0) */
export const savings = Math.max(0, PRICE.full - PRICE.pixTotal);

/** "R$ 1.615" — NBSP entre símbolo e número, sem casas quando inteiro */
export function brl(value: number): string {
  const hasCents = Math.round(value * 100) % 100 !== 0;
  return (
    'R$ ' +
    value.toLocaleString('pt-BR', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

// ---- strings reutilizadas (uma fonte para toda a página) ----
export const perMonthBRL = brl(PRICE.perMonth); // "R$ 99"
export const pixBRL = brl(PRICE.pixTotal); // "R$ 999"
export const fullBRL = brl(PRICE.full); // "R$ 1.615"
export const savingsBRL = brl(savings); // "R$ 616"

/** "12x de R$ 99" */
export const cardLine = `${PRICE.installments}x de ${perMonthBRL}`;
/** "12x R$ 99" (versão curta, sticky) */
export const cardLineShort = `${PRICE.installments}x ${perMonthBRL}`;
/** "Menos de R$ 100" — teto de marketing arredondando a parcela pra cima */
export const underPerMonthBRL = brl(Math.ceil(PRICE.perMonth / 100) * 100);
