import { describe, it, expect } from 'vitest';
import {
  normalizeDayOfMonth,
  validateChargeRequest,
  DizimoError,
} from '../contract';

describe('normalizeDayOfMonth', () => {
  it('mantém dias válidos (1–31)', () => {
    expect(normalizeDayOfMonth(1)).toBe(1);
    expect(normalizeDayOfMonth(15)).toBe(15);
    expect(normalizeDayOfMonth(28)).toBe(28);
    expect(normalizeDayOfMonth(31)).toBe(31);
  });

  it('clamp dias < 1 para 1', () => {
    expect(normalizeDayOfMonth(0)).toBe(1);
    expect(normalizeDayOfMonth(-5)).toBe(1);
  });

  it('preserva a escolha de dias 29–31', () => {
    expect(normalizeDayOfMonth(29)).toBe(29);
    expect(normalizeDayOfMonth(31)).toBe(31);
  });

  it('clamp dias > 31 para 31', () => {
    expect(normalizeDayOfMonth(32)).toBe(31);
  });

  it('lida com NaN / Infinity / não-números', () => {
    expect(normalizeDayOfMonth(NaN)).toBe(1);
    expect(normalizeDayOfMonth(Infinity)).toBe(1);
    // String é rejeitada por `Number.isFinite` (sem coerção) — defesa contra input malformado.
    // @ts-expect-error — testando runtime
    expect(normalizeDayOfMonth('15')).toBe(1);
    // @ts-expect-error — testando runtime
    expect(normalizeDayOfMonth(null)).toBe(1);
    // @ts-expect-error — testando runtime
    expect(normalizeDayOfMonth(undefined)).toBe(1);
  });
});

describe('validateChargeRequest', () => {
  const validReq = {
    amount_cents: 10000,
    method: 'pix' as const,
    recurrence: {
      enabled: true,
      day_of_month: 22,
      interval: 'monthly' as const,
    },
    donor: { name: 'João da Silva', email: 'joao@example.com' },
  };

  it('passa em request válido', () => {
    expect(validateChargeRequest(validReq)).toEqual([]);
  });

  it('rejeita amount_cents < 100', () => {
    const errors = validateChargeRequest({ ...validReq, amount_cents: 50 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe('INVALID_AMOUNT');
  });

  it('rejeita amount_cents ausente', () => {
    const req = { ...validReq, amount_cents: 0 as unknown as number };
    const errors = validateChargeRequest(req);
    expect(errors[0].code).toBe('INVALID_AMOUNT');
  });

  it('rejeita email inválido', () => {
    const errors = validateChargeRequest({
      ...validReq,
      donor: { ...validReq.donor, email: 'not-an-email' },
    });
    expect(errors.some((e) => e.code === 'INVALID_EMAIL')).toBe(true);
  });

  it('rejeita nome curto demais', () => {
    const errors = validateChargeRequest({
      ...validReq,
      donor: { ...validReq.donor, name: 'J' },
    });
    expect(errors.some((e) => e.code === 'INVALID_NAME')).toBe(true);
  });

  it('rejeita day_of_month fora de 1–31 quando recorrência habilitada', () => {
    const errors = validateChargeRequest({
      ...validReq,
      recurrence: { ...validReq.recurrence, day_of_month: 32 },
    });
    expect(errors.some((e) => e.code === 'INVALID_DAY')).toBe(true);
  });

  it('NÃO valida day_of_month quando recorrência está desabilitada', () => {
    const errors = validateChargeRequest({
      ...validReq,
      recurrence: {
        enabled: false,
        day_of_month: 99, // inválido mas não importa
        interval: 'none',
      },
    });
    expect(errors.some((e) => e.code === 'INVALID_DAY')).toBe(false);
  });
});

describe('DizimoError', () => {
  it('carrega code, status e cause', () => {
    const cause = new Error('original');
    const err = new DizimoError('PROVIDER_ERROR', 'falhou', {
      status: 502,
      cause,
    });
    expect(err.code).toBe('PROVIDER_ERROR');
    expect(err.status).toBe(502);
    expect(err.cause).toBe(cause);
    expect(err.name).toBe('DizimoError');
  });

  it('isRecoverable retorna true para erros de input/rede', () => {
    expect(
      new DizimoError('INVALID_AMOUNT', 'x').isRecoverable(),
    ).toBe(true);
    expect(
      new DizimoError('NETWORK_ERROR', 'x').isRecoverable(),
    ).toBe(true);
  });

  it('isRecoverable retorna false para erros terminais', () => {
    expect(
      new DizimoError('CHARGE_NOT_FOUND', 'x').isRecoverable(),
    ).toBe(false);
    expect(
      new DizimoError('CHARGE_EXPIRED', 'x').isRecoverable(),
    ).toBe(false);
  });

  it('separa erros que aceitam retry dos erros corrigíveis pelo usuário', () => {
    const timeout = new DizimoError('PROVIDER_TIMEOUT', 'x');
    const invalidEmail = new DizimoError('INVALID_EMAIL', 'x');
    const conflict = new DizimoError('IDEMPOTENCY_CONFLICT', 'x');

    expect(timeout.isRetryable()).toBe(true);
    expect(timeout.isUserActionable()).toBe(false);
    expect(invalidEmail.isRetryable()).toBe(false);
    expect(invalidEmail.isUserActionable()).toBe(true);
    expect(conflict.isRetryable()).toBe(false);
    expect(conflict.isUserActionable()).toBe(false);
  });
});
