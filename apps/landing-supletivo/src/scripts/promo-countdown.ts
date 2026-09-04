/**
 * Contador da janela promocional (progressive enhancement).
 *
 * O componente `PromoScarcity.astro` já renderiza a data por extenso no HTML —
 * este script só acrescenta o relógio. Sem JS, a página continua dizendo até
 * quando a condição vale; só não mostra a contagem.
 *
 * A responsabilidade mais importante daqui NÃO é contar: é ESCONDER o bloco
 * quando o prazo já passou. O site é estático (Astro + Cloudflare Pages), o
 * prazo é embutido em build-time, e nada garante que alguém vá rebuildar no
 * dia em que a promoção acaba. Sem esta verificação no cliente, a página
 * exibiria um prazo vencido — que é pior do que não exibir prazo nenhum, e é
 * exatamente a alegação não comprovável que o CONAR pune.
 *
 * Cadência: 1s na última hora (quando o segundo importa), 30s antes disso.
 * Contador de dias não precisa de precisão de segundo, e timer de 1s rodando
 * por 20 minutos em Android de entrada é bateria jogada fora.
 */
import { track } from './track';

const MS_MIN = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function initPromoCountdown(): void {
  const root = document.querySelector<HTMLElement>('[data-promo]');
  if (!root) return;

  const endsAt = Number(root.dataset.promoEnds);
  if (!Number.isFinite(endsAt) || endsAt <= 0) {
    console.warn('[promo] data-promo-ends ausente ou inválido — bloco removido.');
    root.hidden = true;
    return;
  }

  const clock = root.querySelector<HTMLElement>('[data-promo-clock]');
  const dEl = root.querySelector<HTMLElement>('[data-promo-d]');
  const hEl = root.querySelector<HTMLElement>('[data-promo-h]');
  const mEl = root.querySelector<HTMLElement>('[data-promo-m]');
  if (!clock || !dEl || !hEl || !mEl) return;

  let timer: number | undefined;
  let tracked = false;

  const stop = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const tick = (): void => {
    const left = endsAt - Date.now();

    // prazo vencido: o bloco inteiro sai. Não há degradação parcial aceitável.
    if (left <= 0) {
      root.hidden = true;
      stop();
      return;
    }

    const days = Math.floor(left / MS_DAY);
    const hours = Math.floor((left % MS_DAY) / MS_HOUR);
    const mins = Math.floor((left % MS_HOUR) / MS_MIN);

    dEl.textContent = pad(days);
    hEl.textContent = pad(hours);
    mEl.textContent = pad(mins);

    if (clock.hidden) clock.hidden = false;

    if (!tracked) {
      tracked = true;
      track('promo_view', { days_left: days, ends_at: new Date(endsAt).toISOString() });
    }

    // reagenda com a cadência adequada ao que sobrou
    timer = window.setTimeout(tick, left < MS_HOUR ? 1_000 : 30_000);
  };

  tick();

  // aba escondida não precisa de contador correndo
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else if (timer === undefined && !root.hidden) {
      tick();
    }
  });
}
