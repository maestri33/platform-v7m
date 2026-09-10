import { describe, expect, it } from 'vitest';
import { bonusBlocks, weeklyEarnings, brl, COMMISSION_DIRECT, BONUS_FLAT } from '../../src/config';

describe('Promoter Earnings & Commission Engine', () => {
  it('calcula corretamente comissão direta para 0 indicações', () => {
    const result = weeklyEarnings(0);
    expect(result.direct).toBe(0);
    expect(result.bonus).toBe(0);
    expect(result.total).toBe(0);
  });

  it('calcula ganho direto abaixo da faixa de bônus', () => {
    const result = weeklyEarnings(3);
    expect(result.direct).toBe(3 * COMMISSION_DIRECT);
    expect(result.bonus).toBe(0);
    expect(result.total).toBe(3 * COMMISSION_DIRECT);
  });

  it('destrava 1 bloco de bônus ao atingir 5 indicações', () => {
    expect(bonusBlocks(5)).toBe(1);
    const result = weeklyEarnings(5);
    expect(result.direct).toBe(5 * COMMISSION_DIRECT);
    expect(result.bonus).toBe(BONUS_FLAT);
    expect(result.total).toBe(5 * COMMISSION_DIRECT + BONUS_FLAT);
  });

  it('lida com números decimais e valores negativos com segurança', () => {
    const neg = weeklyEarnings(-2);
    expect(neg.total).toBe(0);

    const floatVal = weeklyEarnings(4.8);
    expect(floatVal.direct).toBe(4 * COMMISSION_DIRECT);
    expect(floatVal.bonus).toBe(0);
  });

  it('formata valores monetários em BRL sem casas decimais', () => {
    const formatted = brl(1500);
    expect(formatted).toContain('1.500');
    expect(formatted).toContain('R$');
  });
});
