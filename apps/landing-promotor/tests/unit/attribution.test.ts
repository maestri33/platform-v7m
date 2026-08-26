/**
 * Regras de negócio da atribuição de polo (first-touch, hub→ref).
 * Bug aqui = promotor amarrado ao polo errado — por isso a cobertura dedicada.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { initAttribution, decorateCtas, poloValue } from '../../src/scripts/attribution';

const APP = 'https://app.maestri.group';

function clearCookies(): void {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=;max-age=0;path=/`;
  });
}

beforeEach(() => {
  localStorage.clear();
  clearCookies();
});

describe('initAttribution — first-touch (hub)', () => {
  it('captura hub + UTMs + gclid da URL e persiste (localStorage + cookie pr_hub)', () => {
    const attr = initAttribution('?hub=polo1&utm_source=google&utm_campaign=lanc&gclid=g123');

    expect(attr).toMatchObject({
      hub: 'polo1',
      utm_source: 'google',
      utm_campaign: 'lanc',
      gclid: 'g123',
    });
    expect(attr?.ts).toBeTypeOf('number');

    const stored = JSON.parse(localStorage.getItem('pr_attribution')!);
    expect(stored.hub).toBe('polo1');
    expect(document.cookie).toContain('pr_hub=polo1');
  });

  it('aceita ?ref= como alias de entrada do polo', () => {
    const attr = initAttribution('?ref=poloX');
    expect(poloValue(attr)).toBe('poloX');
    expect(document.cookie).toContain('pr_hub=poloX');
  });

  it('visita posterior SEM polo mantém o primeiro (first-touch)', () => {
    initAttribution('?hub=primeiro&utm_source=google');
    const attr = initAttribution('');

    expect(attr?.hub).toBe('primeiro');
    expect(attr?.utm_source).toBe('google');
  });

  it('hub novo explícito na URL sobrescreve o anterior', () => {
    initAttribution('?hub=primeiro');
    const attr = initAttribution('?hub=segundo');

    expect(attr?.hub).toBe('segundo');
    expect(JSON.parse(localStorage.getItem('pr_attribution')!).hub).toBe('segundo');
    expect(document.cookie).toContain('pr_hub=segundo');
  });

  it('visita só com UTMs (sem polo) captura os UTMs', () => {
    const attr = initAttribution('?utm_source=facebook&fbclid=f1');

    expect(attr).toMatchObject({ utm_source: 'facebook', fbclid: 'f1' });
    expect(poloValue(attr)).toBeNull();
  });

  it('localStorage perdido: recupera o polo do cookie pr_hub', () => {
    initAttribution('?hub=resgatado');
    localStorage.clear();

    const attr = initAttribution('');
    expect(attr?.hub).toBe('resgatado');
  });

  it('sem nada na URL nem armazenado: retorna null', () => {
    expect(initAttribution('')).toBeNull();
  });

  it('atribuição com mais de 90 dias expira (coerente com o cookie)', () => {
    const old = { hub: 'velho', ts: Date.now() - 91 * 24 * 60 * 60 * 1000 };
    localStorage.setItem('pr_attribution', JSON.stringify(old));

    expect(initAttribution('')).toBeNull();
    expect(localStorage.getItem('pr_attribution')).toBeNull();
  });

  it('atribuição com menos de 90 dias continua valendo', () => {
    const recent = { hub: 'recente', ts: Date.now() - 30 * 24 * 60 * 60 * 1000 };
    localStorage.setItem('pr_attribution', JSON.stringify(recent));

    expect(initAttribution('')?.hub).toBe('recente');
  });

  it('parâmetros desconhecidos são ignorados', () => {
    const attr = initAttribution('?hub=x&malicioso=1&foo=bar');
    expect(attr).not.toHaveProperty('malicioso');
    expect(attr).not.toHaveProperty('foo');
  });
});

describe('decorateCtas — hub vira ref no app', () => {
  it('envia o polo como ref + repassa UTMs em todos os <a data-cta>', () => {
    document.body.innerHTML = `
      <a data-cta="hero" href="${APP}">CTA</a>
      <a data-cta="sticky" href="${APP}">CTA</a>
      <a href="https://outro.com">não-CTA</a>
    `;
    const attr = initAttribution('?hub=polo1&utm_source=google');
    decorateCtas(attr);

    const ctas = [...document.querySelectorAll<HTMLAnchorElement>('a[data-cta]')];
    for (const a of ctas) {
      const url = new URL(a.href);
      expect(url.searchParams.get('ref')).toBe('polo1');
      expect(url.searchParams.get('utm_source')).toBe('google');
      expect(url.searchParams.get('hub')).toBeNull(); // não vaza o nome interno
    }
    const other = document.querySelector<HTMLAnchorElement>('a:not([data-cta])')!;
    expect(other.href).not.toContain('ref=');
  });

  it('?ref= de entrada também é encaminhado como ref', () => {
    document.body.innerHTML = `<a data-cta="hero" href="${APP}">CTA</a>`;
    decorateCtas(initAttribution('?ref=poloX'));
    const url = new URL(document.querySelector<HTMLAnchorElement>('a')!.href);
    expect(url.searchParams.get('ref')).toBe('poloX');
  });

  it('sem atribuição, CTAs ficam intactos', () => {
    document.body.innerHTML = `<a data-cta="hero" href="${APP}/">CTA</a>`;
    decorateCtas(null);
    expect(document.querySelector<HTMLAnchorElement>('a')!.href).toBe(`${APP}/`);
  });
});
