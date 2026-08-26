/**
 * Entry único do client: atribuição, eventos e animações.
 * Tudo é progressive enhancement — a página funciona sem este arquivo.
 */
import { initAttribution, decorateCtas, ATTR_KEYS } from './attribution';
import { track } from './track';
import { weeklyEarnings, brl } from '../config';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Atribuição + page_view ---------- */
const attr = initAttribution();
decorateCtas(attr);

const attrPayload: Record<string, unknown> = {};
if (attr) {
  for (const key of ATTR_KEYS) if (attr[key]) attrPayload[key] = attr[key];
}
track('page_view', attrPayload);

/* ---------- cta_click (delegado) ---------- */
document.addEventListener('click', (e) => {
  const target = e.target as Element | null;
  const cta = target?.closest<HTMLAnchorElement>('a[data-cta]');
  if (cta) track('cta_click', { position: cta.dataset.cta });
});

/* ---------- faq_open ---------- */
document.querySelectorAll<HTMLDetailsElement>('details[data-faq]').forEach((details) => {
  details.addEventListener('toggle', () => {
    const question = details.querySelector('summary')?.textContent?.trim() ?? '';
    track(details.open ? 'faq_open' : 'faq_close', { question });
  });
});

/* ---------- FAQ: filtro por categoria (chips) ----------
 * Sem JS, todos os 14 itens já renderizam (filtro é display:none até JS).
 * Com JS: clique num chip filtra; 'Todas' reseta. Mantém estado em dataset. */
const faqList = document.querySelector<HTMLElement>('.faq-list');
const faqChips = document.querySelectorAll<HTMLButtonElement>('.faq-chip');
if (faqList && faqChips.length > 0) {
  const setCat = (cat: string): void => {
    if (cat === 'all') delete faqList.dataset.activeCat;
    else faqList.dataset.activeCat = cat;
    faqChips.forEach((c) => {
      const on = (c.dataset.faqFilter ?? 'all') === cat;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    // data-reveal deixa itens fora do fold em opacity:0; depois de filtrar,
    // o item pode subir pra cima do fold mas continuar invisível. Forçamos
    // .in-view em todos os que sobrevivem ao filtro.
    faqList.querySelectorAll<HTMLElement>('.faq-item').forEach((el) => {
      if (cat === 'all' || el.getAttribute('data-cat') === cat) {
        el.classList.add('in-view');
      }
    });
  };
  faqChips.forEach((c) =>
    c.addEventListener('click', () => setCat(c.dataset.faqFilter ?? 'all'))
  );
  document.querySelector<HTMLButtonElement>('[data-faq-reset]')?.addEventListener('click', () => setCat('all'));
}

/* ---------- section_view: funil por seção ---------- */
const sections = document.querySelectorAll<HTMLElement>('[data-section]');
if (sections.length > 0 && 'IntersectionObserver' in window) {
  const sectionIo = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          track('section_view', { section: (entry.target as HTMLElement).dataset.section });
          sectionIo.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.35 }
  );
  sections.forEach((el) => sectionIo.observe(el));
}

/* ---------- Erros de runtime → dataLayer (visível quando o GTM entrar) ---------- */
window.addEventListener('error', (e) => {
  track('js_error', { message: String(e.message ?? 'erro').slice(0, 150) });
});
window.addEventListener('unhandledrejection', (e) => {
  track('js_error', { message: `unhandledrejection: ${String(e.reason ?? '')}`.slice(0, 150) });
});

/* ---------- scroll_depth (25/50/75/100) ---------- */
const depthMarks = [25, 50, 75, 100];
const fired = new Set<number>();
function checkDepth(): void {
  const doc = document.documentElement;
  const viewport = window.innerHeight || doc.clientHeight;
  const depth = ((doc.scrollTop + viewport) / doc.scrollHeight) * 100;
  for (const mark of depthMarks) {
    if (depth >= mark && !fired.has(mark)) {
      fired.add(mark);
      track('scroll_depth', { depth: mark });
    }
  }
  if (fired.size === depthMarks.length) {
    window.removeEventListener('scroll', checkDepth);
  }
}
window.addEventListener('scroll', checkDepth, { passive: true });
checkDepth();

/* ---------- Calculadora de ganhos ----------
 * Fonte única dos números: weeklyEarnings() em src/config.ts.
 * Sem JS: a tabela estática (renderizada no server) já responde. */
const calcRange = document.querySelector<HTMLInputElement>('[data-calc-range]');
if (calcRange) {
  const calcRoot = calcRange.closest<HTMLElement>('.calc');
  const out = {
    paid: document.querySelector<HTMLElement>('[data-calc-paid]'),
    total: document.querySelector<HTMLElement>('[data-calc-total]'),
    direct: document.querySelector<HTMLElement>('[data-calc-direct]'),
    bonus: document.querySelector<HTMLElement>('[data-calc-bonus]'),
    bonusRow: document.querySelector<HTMLElement>('[data-calc-bonus-row]'),
  };
  let calcTracked = false;
  const render = (): void => {
    const n = Number(calcRange.value);
    const { direct, bonus, total } = weeklyEarnings(n);
    if (out.paid) out.paid.textContent = String(n);
    if (out.total) out.total.textContent = brl(total);
    if (out.direct) out.direct.textContent = brl(direct);
    if (out.bonus) out.bonus.textContent = brl(bonus);
    if (out.bonusRow) out.bonusRow.classList.toggle('on', bonus > 0);
    calcRange.setAttribute('aria-valuetext', `${n} matrículas pagas, ${brl(total)} na semana`);
    calcRange.style.setProperty('--calc-fill', `${((n - Number(calcRange.min)) / (Number(calcRange.max) - Number(calcRange.min))) * 100}%`);
  };
  calcRange.addEventListener('input', () => {
    render();
    // o usuário descobriu que o slider é interativo: o hint pode sair
    calcRoot?.classList.add('touched');
    syncPresetState();
    // celebrar o instante em que o bônus destrava (passar de 4 → 5)
    if (!REDUCED && out.bonusRow?.classList.contains('on')) {
      out.bonusRow.classList.remove('just-unlocked');
      // reflow pra resetar a animação
      void out.bonusRow.offsetWidth;
      out.bonusRow.classList.add('just-unlocked');
    }
    if (!calcTracked) {
      calcTracked = true;
      track('calc_use', {});
    }
  });

  // presets: clicar num botão move o slider e dispara o input handler
  const presetBtns = calcRoot?.querySelectorAll<HTMLButtonElement>('[data-calc-preset]');
  const syncPresetState = (): void => {
    const current = Number(calcRange.value);
    presetBtns?.forEach((b) => {
      const on = Number(b.dataset.calcPreset) === current;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };
  presetBtns?.forEach((b) => {
    b.addEventListener('click', () => {
      calcRange.value = b.dataset.calcPreset ?? calcRange.value;
      // dispara o mesmo handler do input para re-renderizar + tracking
      calcRange.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  render();
  syncPresetState();
}

/* ---------- Reveals por scroll (Intersection Observer) ---------- */
const revealEls = document.querySelectorAll('[data-reveal], [data-seal]');
if (REDUCED || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('in-view'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      }
    },
    // pré-dispara 120px antes de entrar: rolagem rápida no mobile não
    // encontra seção "apagada" esperando o observer
    { threshold: 0.05, rootMargin: '0px 0px 120px 0px' }
  );
  // página pode carregar já rolada (restauração de scroll/âncora): o que
  // ficou acima do viewport aparece direto. Leituras de layout em lote
  // ANTES das escritas para não forçar reflow a cada elemento.
  const aboveViewport: Element[] = [];
  const toObserve: Element[] = [];
  revealEls.forEach((el) => {
    (el.getBoundingClientRect().bottom < 0 ? aboveViewport : toObserve).push(el);
  });
  aboveViewport.forEach((el) => el.classList.add('in-view'));
  toObserve.forEach((el) => io.observe(el));
}

/* ---------- Frases que "acendem" ao cruzar o centro ---------- */
const litEls = document.querySelectorAll('[data-lit]');
if (litEls.length > 0) {
  if (REDUCED || !('IntersectionObserver' in window)) {
    litEls.forEach((el) => el.classList.add('lit'));
  } else {
    const litIo = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('lit');
            litIo.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '-28% 0px -28% 0px' }
    );
    litEls.forEach((el) => litIo.observe(el));
  }
}

/* ---------- Spotlight seguindo o mouse (cards marcados) ---------- */
if (!REDUCED && window.matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll<HTMLElement>('[data-spotlight]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });
}

/* ---------- Sticky CTA ----------
 * Visível só quando: já passou do hero E nenhum CTA da própria página está
 * na tela (senão o sticky cobre exatamente o botão que o usuário ia tocar). */
const sticky = document.querySelector<HTMLElement>('.sticky-cta');
if (sticky && 'IntersectionObserver' in window) {
  const hero = document.querySelector('#hero');
  const inlineCtas = document.querySelectorAll('a[data-cta]:not([data-cta="sticky"])');

  let pastHero = !hero; // páginas sem hero: sticky liberado desde o topo
  const ctasOnScreen = new Set<Element>();
  const updateSticky = (): void => {
    const show = pastHero && ctasOnScreen.size === 0;
    sticky.classList.toggle('visible', show);
    // sincroniza o body pra criar espaço embaixo (só mobile, ver CSS)
    document.body.classList.toggle('has-sticky-cta', show && window.matchMedia('(max-width: 899px)').matches);
  };

  if (hero) {
    new IntersectionObserver(
      ([entry]) => {
        pastHero = !entry.isIntersecting;
        updateSticky();
      },
      { rootMargin: '-64px 0px 0px 0px' }
    ).observe(hero);
  }

  const ctaIo = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) ctasOnScreen.add(entry.target);
        else ctasOnScreen.delete(entry.target);
      }
      updateSticky();
    },
    { threshold: 0.4 }
  );
  inlineCtas.forEach((el) => ctaIo.observe(el));
  updateSticky();
} else {
  sticky?.classList.add('visible');
  document.body.classList.add('has-sticky-cta');
}

/* ---------- Barra de progresso de leitura ---------- */
const bar = document.querySelector<HTMLElement>('.progress-bar');
if (bar) {
  let ticking = false;
  const update = (): void => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? doc.scrollTop / max : 0})`;
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
}

/* ---------- Voltar ao topo ----------
 * Aparece quando o usuário passou do hero e ainda tem bastante página
 * pela frente (some perto do rodapé pra não competir com o footer). */
const btt = document.querySelector<HTMLButtonElement>('[data-btt]');
if (btt) {
  btt.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
  });
  if ('IntersectionObserver' in window) {
    const heroEl = document.querySelector('#hero');
    if (heroEl) {
      new IntersectionObserver(
        ([entry]) => {
          // visível = voltou pro hero; some o botão
          if (entry.isIntersecting) btt.classList.remove('is-visible');
          else btt.classList.add('is-visible');
        },
        { rootMargin: '-40% 0px 0px 0px' }
      ).observe(heroEl);
    } else {
      btt.classList.add('is-visible');
    }
  } else {
    btt.classList.add('is-visible');
  }
}
