import { describe, expect, it } from 'vitest';
import { PRICE, brl, savings, cardLine, cardLineShort } from '../../src/data/price';

describe('Supletivo Brasil — Pricing & Formatting Engine', () => {
  it('objeto PRICE possui estrutura consistente e valores positivos', () => {
    expect(PRICE.installments).toBeGreaterThan(0);
    expect(PRICE.perMonth).toBeGreaterThan(0);
    expect(PRICE.cardTotal).toBeGreaterThan(0);
    expect(PRICE.pixTotal).toBeGreaterThan(0);
    expect(PRICE.full).toBeGreaterThan(PRICE.pixTotal);
  });

  it('economia do Pix (savings) é positiva em relação ao preço cheio', () => {
    expect(savings).toBe(PRICE.full - PRICE.pixTotal);
    expect(savings).toBeGreaterThan(0);
  });

  it('função brl() formata inteiros sem centavos e quebrados com 2 casas', () => {
    expect(brl(999)).toMatch(/R\$\s*999/);
    expect(brl(99.5)).toMatch(/R\$\s*99,50/);
    expect(brl(1615)).toMatch(/R\$\s*1\.615/);
  });

  it('linhas descritivas de cartão refletem o número de parcelas', () => {
    expect(cardLine).toContain(`${PRICE.installments}x de`);
    expect(cardLineShort).toContain(`${PRICE.installments}x`);
  });
});
