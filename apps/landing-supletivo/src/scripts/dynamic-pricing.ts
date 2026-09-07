/**
 * Motor de precificação dinâmica da vitrine e por indicação (client-side progressive enhancement).
 * Consulta a API de pricing em runtime para sincronizar valores em tempo real nas páginas e ilhas,
 * e se o visitante possuir ?ref=... válido, exibe o banner do consultor e aplica desconto.
 */
import { initAttribution, type Attribution } from './attribution';
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
  anchor_full?: string | null;
}

const BACKEND_URL =
  import.meta.env.PUBLIC_BACKEND_URL ??
  import.meta.env.BACKEND_URL ??
  (import.meta.env.DEV ? 'http://localhost:8001' : 'https://backend.v7m.live');

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

export async function initDynamicPricing(resolvedAttr?: Attribution | null): Promise<void> {
  const attr = resolvedAttr !== undefined ? resolvedAttr : initAttribution();

  try {
    const url = attr?.ref
      ? `${BACKEND_URL}/api/v1/clients/pricing?ref=${encodeURIComponent(attr.ref)}`
      : `${BACKEND_URL}/api/v1/clients/pricing`;

    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return;

    const data = (await res.json()) as PricingResponse;

    const usePromo = Boolean(data.has_discount && data.promoter_name && data.promo_card && data.promo_pix);
    const activeCard = usePromo && data.promo_card ? data.promo_card : data.card;
    const activePix = usePromo && data.promo_pix ? Number(data.promo_pix) : Number(data.pix);

    if (!activeCard || !Number.isFinite(Number(activeCard.installment)) || !Number.isFinite(activePix)) {
      return;
    }

    const installmentNum = Number(activeCard.installment);
    const installmentsCount = Number(activeCard.installments) || 12;
    const perMonthStr = brl(installmentNum);
    const pixStr = brl(activePix);
    const cardLine = `${installmentsCount}x de ${perMonthStr}`;
    const underPerMonth = brl(Math.ceil(installmentNum / 100) * 100);

    // 1. Atualizar dígitos animados e títulos de preço
    const srOnly = document.querySelector<HTMLElement>('[data-price-sr]');
    if (srOnly) srOnly.textContent = `${perMonthStr} por mês`;

    const titleEl = document.querySelector<HTMLElement>('#pricing-title');
    if (titleEl) titleEl.textContent = `Menos de ${underPerMonth} por mês.`;

    const finalPerMonth = document.querySelectorAll<HTMLElement>('[data-price-per-month]');
    finalPerMonth.forEach((el) => {
      el.textContent = perMonthStr;
    });

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

    // 2. Atualizar valores à vista no Pix (em todos os pontos da página)
    const pixEls = document.querySelectorAll<HTMLElement>('[data-price-pix-val]');
    pixEls.forEach((el) => {
      el.textContent = pixStr;
    });

    // 3. Atualizar linhas de parcelamento no cartão
    const cardLineEls = document.querySelectorAll<HTMLElement>('[data-price-card-line]');
    cardLineEls.forEach((el) => {
      el.textContent = cardLine;
    });

    const modeLineEl = document.querySelector<HTMLElement>('[data-price-mode-line]');
    if (modeLineEl) {
      modeLineEl.textContent = `em ${installmentsCount}x no cartão de crédito`;
    }

    const stickyTitle = document.querySelector<HTMLElement>('[data-sticky-price] strong');
    if (stickyTitle) {
      stickyTitle.textContent = `${installmentsCount}x ${perMonthStr}`;
    }

    // 4. Preço âncora riscado e economia
    if (data.anchor_full) {
      const anchorNum = Number(data.anchor_full);
      if (Number.isFinite(anchorNum) && anchorNum > 0) {
        const oldValEl = document.querySelector<HTMLElement>('[data-price-old-val]');
        if (oldValEl) oldValEl.textContent = brl(anchorNum);

        const savingsVal = Math.max(0, anchorNum - activePix);
        const savingsEl = document.querySelector<HTMLElement>('[data-price-savings]');
        if (savingsEl) savingsEl.textContent = brl(savingsVal);
      }
    }

    // 5. Se houver desconto de promotor/consultor, aplicar visual e banner
    if (data.has_discount && data.promoter_name) {
      const banner = document.querySelector<HTMLElement>('[data-promoter-banner]');
      const nameEl = document.querySelector<HTMLElement>('[data-promoter-name]');

      if (nameEl) nameEl.textContent = data.promoter_name;
      if (banner) {
        banner.classList.remove('hidden');
        banner.classList.add('is-visible');
      }

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
        ref: attr?.ref,
        promoter: data.promoter_name,
      });
    }
  } catch (err) {
    console.debug('[dynamic-pricing] fallback para preço do build:', err);
  }
}
