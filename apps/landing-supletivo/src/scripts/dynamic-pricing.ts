/**
 * Motor de precificação dinâmica por indicação (client-side progressive enhancement).
 * Se o visitante possuir ?ref=... válido, consulta o backend, exibe o banner do
 * consultor e atualiza a ancoragem de preços para o valor com desconto.
 */
import { initAttribution } from './attribution';
import { track } from './track';

interface PricingResponse {
  pix: string;
  card: {
    installments: number;
    installment: string;
    total: string;
  };
  promo_pix?: string;
  promo_card?: {
    installments: number;
    installment: string;
    total: string;
  };
  has_discount?: boolean;
  promoter_name?: string | null;
}

const BACKEND_URL =
  import.meta.env.PUBLIC_BACKEND_URL ??
  (import.meta.env.DEV ? 'http://localhost:8001' : 'https://api.supletivo.net.br');

function brl(value: number): string {
  const hasCents = Math.round(value * 100) % 100 !== 0;
  return (
    'R$ ' +
    value.toLocaleString('pt-BR', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

export async function initDynamicPricing(): Promise<void> {
  const attr = initAttribution();
  if (!attr?.ref) return;

  try {
    const url = `${BACKEND_URL}/api/v1/clients/pricing?ref=${encodeURIComponent(attr.ref)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return;

    const data = (await res.json()) as PricingResponse;
    if (!data.has_discount || !data.promoter_name) return;

    // 1. Atualizar e exibir o banner do consultor
    const banner = document.querySelector<HTMLElement>('[data-promoter-banner]');
    const nameEl = document.querySelector<HTMLElement>('[data-promoter-name]');

    if (nameEl) nameEl.textContent = data.promoter_name;
    if (banner) {
      banner.classList.remove('hidden');
      banner.classList.add('is-visible');
    }

    // 2. Atualizar valores no card de preços se os campos promocionais estiverem presentes
    const promoInstallment = data.promo_card ? Number(data.promo_card.installment) : null;
    const promoPix = data.promo_pix ? Number(data.promo_pix) : null;

    if (promoInstallment) {
      const perMonthStr = brl(promoInstallment);
      const digitEls = document.querySelectorAll<HTMLElement>('[data-price-digit]');
      const srOnly = document.querySelector<HTMLElement>('[data-price-sr]');
      const titleEl = document.querySelector<HTMLElement>('#pricing-title');

      if (srOnly) srOnly.textContent = `${perMonthStr} por mês`;
      if (titleEl) titleEl.textContent = `Menos de ${perMonthStr} por mês.`;

      // Atualiza os dígitos animados
      const digitsContainer = document.querySelector<HTMLElement>('[data-price-digits]');
      if (digitsContainer) {
        digitsContainer.innerHTML = '';
        perMonthStr.split('').forEach((ch, i) => {
          const span = document.createElement('span');
          span.className = 'digit';
          span.style.setProperty('--g', String(i));
          span.textContent = ch;
          digitsContainer.appendChild(span);
        });
      }
    }

    if (promoPix) {
      const pixEl = document.querySelector<HTMLElement>('[data-price-pix-val]');
      if (pixEl) pixEl.textContent = brl(promoPix);
    }

    // 3. Adicionar badge de desconto de consultor no card
    const priceCard = document.querySelector<HTMLElement>('[data-price]');
    if (priceCard) {
      priceCard.classList.add('has-consultant-discount');
      const badge = document.querySelector<HTMLElement>('[data-promo-badge]');
      if (badge) {
        badge.classList.remove('hidden');
        badge.textContent = `✨ Desconto de Consultor (${data.promoter_name})`;
      }
    }

    track('promoter_discount_applied', {
      ref: attr.ref,
      promoter: data.promoter_name,
    });
  } catch (err) {
    console.debug('[dynamic-pricing] fallback para preço estático:', err);
  }
}
