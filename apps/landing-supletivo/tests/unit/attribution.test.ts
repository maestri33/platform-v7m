/**
 * Regras de negócio da atribuição de afiliados (first-touch).
 * Bug aqui = comissão paga errada — por isso a cobertura dedicada.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { initAttribution, decorateCtas } from '../../src/scripts/attribution';

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

describe('initAttribution — first-touch', () => {
  it('captura ref + UTMs + gclid da URL e persiste (localStorage + cookie)', () => {
    const attr = initAttribution('?ref=afiliado1&utm_source=google&utm_campaign=lanc&gclid=g123');

    expect(attr).toMatchObject({
      ref: 'afiliado1',
      utm_source: 'google',
      utm_campaign: 'lanc',
      gclid: 'g123',
    });
    expect(attr?.ts).toBeTypeOf('number');

    const stored = JSON.parse(localStorage.getItem('sb_attribution')!);
    expect(stored.ref).toBe('afiliado1');
    expect(document.cookie).toContain('sb_ref=afiliado1');
  });

  it('visita posterior SEM ref mantém o primeiro ref (first-touch)', () => {
    initAttribution('?ref=primeiro&utm_source=google');
    const attr = initAttribution('');

    expect(attr?.ref).toBe('primeiro');
    expect(attr?.utm_source).toBe('google');
  });

  it('ref novo explícito na URL sobrescreve o anterior', () => {
    initAttribution('?ref=primeiro');
    const attr = initAttribution('?ref=segundo');

    expect(attr?.ref).toBe('segundo');
    expect(JSON.parse(localStorage.getItem('sb_attribution')!).ref).toBe('segundo');
    expect(document.cookie).toContain('sb_ref=segundo');
  });

  it('visita só com UTMs (sem ref) captura os UTMs', () => {
    const attr = initAttribution('?utm_source=facebook&fbclid=f1');

    expect(attr).toMatchObject({ utm_source: 'facebook', fbclid: 'f1' });
    expect(attr?.ref).toBeUndefined();
  });

  it('localStorage perdido: recupera o ref do cookie sb_ref', () => {
    initAttribution('?ref=resgatado');
    localStorage.clear();

    const attr = initAttribution('');
    expect(attr?.ref).toBe('resgatado');
  });

  it('sem nada na URL nem armazenado: retorna null', () => {
    expect(initAttribution('')).toBeNull();
  });

  it('atribuição com mais de 90 dias expira (coerente com o cookie)', () => {
    const old = { ref: 'velho', ts: Date.now() - 91 * 24 * 60 * 60 * 1000 };
    localStorage.setItem('sb_attribution', JSON.stringify(old));

    expect(initAttribution('')).toBeNull();
    expect(localStorage.getItem('sb_attribution')).toBeNull();
  });

  it('atribuição com menos de 90 dias continua valendo', () => {
    const recent = { ref: 'recente', ts: Date.now() - 30 * 24 * 60 * 60 * 1000 };
    localStorage.setItem('sb_attribution', JSON.stringify(recent));

    expect(initAttribution('')?.ref).toBe('recente');
  });

  it('parâmetros desconhecidos são ignorados', () => {
    const attr = initAttribution('?ref=x&malicioso=1&foo=bar');
    expect(attr).not.toHaveProperty('malicioso');
    expect(attr).not.toHaveProperty('foo');
  });
});

describe('decorateCtas', () => {
  it('anexa os parâmetros capturados em todos os <a data-cta>', () => {
    document.body.innerHTML = `
      <a data-cta="hero" href="https://app.supletivo.net.br">CTA</a>
      <a data-cta="sticky" href="https://app.supletivo.net.br">CTA</a>
      <a href="https://outro.com">não-CTA</a>
    `;
    const attr = initAttribution('?ref=teste123&utm_source=google');
    decorateCtas(attr);

    const ctas = [...document.querySelectorAll<HTMLAnchorElement>('a[data-cta]')];
    for (const a of ctas) {
      const url = new URL(a.href);
      expect(url.searchParams.get('ref')).toBe('teste123');
      expect(url.searchParams.get('utm_source')).toBe('google');
    }
    const other = document.querySelector<HTMLAnchorElement>('a:not([data-cta])')!;
    expect(other.href).not.toContain('ref=');
  });

  it('sem atribuição, CTAs ficam intactos', () => {
    document.body.innerHTML = `<a data-cta="hero" href="https://app.supletivo.net.br/">CTA</a>`;
    decorateCtas(null);
    expect(document.querySelector<HTMLAnchorElement>('a')!.href).toBe(
      'https://app.supletivo.net.br/'
    );
  });
});
