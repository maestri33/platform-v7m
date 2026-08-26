import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  dizimoApi,
  __resetMockState,
  __getMockState,
  setFailureRate,
  setTimeoutRate,
  setMockTiming,
} from '../dizimoApi';
import {
  DizimoError,
  type ChargeRequest,
  type WebhookEvent,
} from '../contract';

describe('dizimoApi', () => {
  beforeEach(() => {
    __resetMockState();
    setFailureRate(0);
    setTimeoutRate(0);
    setMockTiming({ networkDelayMs: 0, webhookDelayMs: 60_000 });
  });

  afterEach(() => {
    __resetMockState();
  });

  const validReq = {
    idempotency_key: 'd9428888-122b-4d40-8465-0e5a2683e2c8',
    amount_cents: 10000,
    method: 'pix' as const,
    recurrence: {
      enabled: true,
      day_of_month: 22,
      interval: 'monthly' as const,
    },
    donor: { name: 'João da Silva', email: 'joao@example.com' },
  };

  describe('createCharge', () => {
    it('cria charge Pix com qr_code_payload provider-agnostic e copy_paste', async () => {
      const charge = await dizimoApi.createCharge(validReq);
      expect(charge.id).toMatch(/^ch_/);
      expect(charge.method).toBe('pix');
      expect(charge.status).toBe('pending');
      expect(charge.payment.pix).toBeDefined();
      expect(charge.payment.pix!.qr_code_payload).toMatch(/^<svg/);
      expect(charge.payment.pix!.copy_paste.length).toBeGreaterThan(50);
      expect(charge.payment.card).toBeUndefined();
    });

    it('cria charge Cartão com redirect_url e session_id', async () => {
      const charge = await dizimoApi.createCharge({
        ...validReq,
        method: 'cartao',
      });
      expect(charge.method).toBe('cartao');
      expect(charge.payment.card).toBeDefined();
      expect(charge.payment.card!.redirect_url).toMatch(/^\/dizimo/);
      expect(charge.payment.card!.session_id).toMatch(/^sess_/);
      expect(charge.payment.pix).toBeUndefined();
    });

    it('anexa recurrence_id quando recorrência habilitada', async () => {
      const charge = await dizimoApi.createCharge(validReq);
      expect(charge.recurrence_id).toMatch(/^recur_/);
    });

    it('NÃO anexa recurrence_id quando recorrência desabilitada', async () => {
      const charge = await dizimoApi.createCharge({
        ...validReq,
        recurrence: {
          enabled: false,
          day_of_month: 1,
          interval: 'none',
        },
      });
      expect(charge.recurrence_id).toBeUndefined();
    });

    it('lança INVALID_AMOUNT quando amount < 100', async () => {
      await expect(
        dizimoApi.createCharge({ ...validReq, amount_cents: 50 }),
      ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
    });

    it('lança INVALID_EMAIL quando email é inválido', async () => {
      await expect(
        dizimoApi.createCharge({
          ...validReq,
          donor: { ...validReq.donor, email: 'broken' },
        }),
      ).rejects.toMatchObject({ code: 'INVALID_EMAIL' });
    });

    it('lança PROVIDER_ERROR quando failureRate = 1', async () => {
      setFailureRate(1);
      await expect(dizimoApi.createCharge(validReq)).rejects.toBeInstanceOf(
        DizimoError,
      );
      await expect(dizimoApi.createCharge(validReq)).rejects.toMatchObject({
        code: 'PROVIDER_ERROR',
        status: 502,
      });
    });

    it('persiste o charge (recuperável via getCharge)', async () => {
      const created = await dizimoApi.createCharge(validReq);
      const fetched = await dizimoApi.getCharge(created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.amount_cents).toBe(created.amount_cents);
    });

    it('retorna a mesma cobrança para a mesma chave e o mesmo request', async () => {
      const first = await dizimoApi.createCharge(validReq);
      const replay = await dizimoApi.createCharge({
        ...validReq,
        donor: { ...validReq.donor },
      });

      expect(replay).toEqual(first);
      expect(__getMockState().chargeCount).toBe(1);
      expect(__getMockState().recurrenceCount).toBe(1);
    });

    it('deduplica requests concorrentes com a mesma chave', async () => {
      setMockTiming({ networkDelayMs: 20, webhookDelayMs: 60_000 });

      const [first, duplicate] = await Promise.all([
        dizimoApi.createCharge(validReq),
        dizimoApi.createCharge({ ...validReq }),
      ]);

      expect(duplicate.id).toBe(first.id);
      expect(__getMockState().chargeCount).toBe(1);
      expect(__getMockState().recurrenceCount).toBe(1);
    });

    it('lança conflito tipado ao reutilizar a chave com outro request', async () => {
      await dizimoApi.createCharge(validReq);

      await expect(
        dizimoApi.createCharge({ ...validReq, amount_cents: 20000 }),
      ).rejects.toMatchObject({
        code: 'IDEMPOTENCY_CONFLICT',
        status: 409,
      });
      expect(__getMockState().chargeCount).toBe(1);
    });

    it('não registra chave quando uma tentativa transitória falha', async () => {
      setFailureRate(1);
      await expect(dizimoApi.createCharge(validReq)).rejects.toMatchObject({
        code: 'PROVIDER_ERROR',
      });

      setFailureRate(0);
      await expect(dizimoApi.createCharge(validReq)).resolves.toMatchObject({
        amount_cents: validReq.amount_cents,
      });
    });

    it('rejeita idempotency_key ausente ou inválida na fronteira simulada', async () => {
      await expect(
        dizimoApi.createCharge({ ...validReq, idempotency_key: '' }),
      ).rejects.toMatchObject({ code: 'INVALID_IDEMPOTENCY_KEY', status: 400 });
    });

    it.each([
      ['método desconhecido', { ...validReq, method: 'boleto' }],
      [
        'intervalo incoerente',
        {
          ...validReq,
          recurrence: { ...validReq.recurrence, interval: 'none' },
        },
      ],
      ['valor decimal', { ...validReq, amount_cents: 100.5 }],
      ['valor infinito', { ...validReq, amount_cents: Infinity }],
      ['flag de recorrência não booleana', {
        ...validReq,
        recurrence: { ...validReq.recurrence, enabled: 'yes' },
      }],
      ['metadata com valor não textual', {
        ...validReq,
        metadata: { origem: 123 },
      }],
      ['recorrência ausente', {
        ...validReq,
        recurrence: undefined,
      }],
      ['doador ausente', {
        ...validReq,
        donor: undefined,
      }],
    ])('rejeita payload runtime malformado: %s', async (_caseName, malformed) => {
      await expect(
        dizimoApi.createCharge(malformed as unknown as ChargeRequest),
      ).rejects.toMatchObject({ code: 'INVALID_REQUEST', status: 400 });
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['texto no topo', 'doador-secreto@example.org'],
    ])(
      'converte entrada top-level %s em DizimoError sem vazar o payload',
      async (_caseName, malformed) => {
        const debug = vi
          .spyOn(console, 'debug')
          .mockImplementation(() => undefined);

        const rejection = dizimoApi.createCharge(
          malformed as unknown as ChargeRequest,
        );

        await expect(rejection).rejects.toBeInstanceOf(DizimoError);
        await expect(rejection).rejects.toMatchObject({
          code: 'INVALID_REQUEST',
          status: 400,
        });
        expect(JSON.stringify(debug.mock.calls)).not.toContain(
          'doador-secreto@example.org',
        );

        debug.mockRestore();
      },
    );
  });

  describe('getCharge', () => {
    it('lança CHARGE_NOT_FOUND para id inexistente', async () => {
      await expect(dizimoApi.getCharge('ch_doesnotexist')).rejects.toMatchObject(
        { code: 'CHARGE_NOT_FOUND' },
      );
    });
  });

  describe('cancelRecurrence', () => {
    it('cancela recorrência existente e emite webhook', async () => {
      const events: WebhookEvent[] = [];
      const unsub = dizimoApi.onWebhookEvent((e) => events.push(e));
      const created = await dizimoApi.createCharge(validReq);
      expect(created.recurrence_id).toBeDefined();
      await dizimoApi.cancelRecurrence(created.recurrence_id!);
      // Webhook é síncrono no cancelRecurrence
      expect(events.some((e) => e.type === 'recurrence.canceled')).toBe(true);
      expect(events[0]).toMatchObject({
        type: 'recurrence.canceled',
        recurrence_id: created.recurrence_id,
      });
      expect(events[0].charge_id).toBeUndefined();
      expect(events[0].idempotency_key).toMatch(/^evt_/);
      unsub();
    });

    it('lança RECURRENCE_NOT_FOUND para id inexistente', async () => {
      await expect(
        dizimoApi.cancelRecurrence('recur_doesnotexist'),
      ).rejects.toMatchObject({ code: 'RECURRENCE_NOT_FOUND' });
    });
  });

  describe('webhook subscription', () => {
    it('permite múltiplos subscribers', () => {
      __resetMockState();
      const calls1: WebhookEvent[] = [];
      const calls2: WebhookEvent[] = [];
      const u1 = dizimoApi.onWebhookEvent((e) => calls1.push(e));
      const u2 = dizimoApi.onWebhookEvent((e) => calls2.push(e));
      expect(__getMockState().subscriberCount).toBe(2);
      u1();
      u2();
      expect(__getMockState().subscriberCount).toBe(0);
    });

    it('mantém polling e webhook consistentes após a transição terminal', async () => {
      setMockTiming({ networkDelayMs: 0, webhookDelayMs: 0 });
      const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const events: WebhookEvent[] = [];
      const unsubscribe = dizimoApi.onWebhookEvent((event) => events.push(event));

      const created = await dizimoApi.createCharge(validReq);
      await vi.waitFor(() => {
        expect(events).toHaveLength(1);
      });
      const polled = await dizimoApi.getCharge(created.id);

      expect(events[0]).toMatchObject({
        type: 'charge.paid',
        charge_id: created.id,
      });
      expect(events[0].idempotency_key).toMatch(/^evt_/);
      expect(polled.status).toBe('paid');

      unsubscribe();
      random.mockRestore();
    });
  });

  describe('logging seguro', () => {
    it('registra entrada, saída e erro sem dados pessoais nem chave idempotente', async () => {
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

      await dizimoApi.createCharge(validReq);
      await expect(dizimoApi.getCharge('ch_inexistente')).rejects.toMatchObject({
        code: 'CHARGE_NOT_FOUND',
      });

      const serializedLogs = JSON.stringify(debug.mock.calls);
      expect(serializedLogs).toContain('createCharge');
      expect(serializedLogs).toContain('success');
      expect(serializedLogs).toContain('error');
      expect(serializedLogs).not.toContain(validReq.donor.name);
      expect(serializedLogs).not.toContain(validReq.donor.email);
      expect(serializedLogs).not.toContain(validReq.idempotency_key);

      debug.mockRestore();
    });

    it('sanitiza método malformado antes de registrar a entrada', async () => {
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
      const injectedPii = 'doador@example.org';

      await expect(
        dizimoApi.createCharge({
          ...validReq,
          method: injectedPii,
        } as unknown as ChargeRequest),
      ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });

      const serializedLogs = JSON.stringify(debug.mock.calls);
      expect(serializedLogs).toContain('invalid');
      expect(serializedLogs).not.toContain(injectedPii);

      debug.mockRestore();
    });
  });

  describe('dia da recorrência', () => {
    it('aceita dia 31 sem converter silenciosamente para 28', async () => {
      const charge = await dizimoApi.createCharge({
        ...validReq,
        recurrence: {
          enabled: true,
          day_of_month: 31,
          interval: 'monthly',
        },
      });
      const fetched = await dizimoApi.getCharge(charge.id);
      expect(fetched.recurrence_id).toBeDefined();
      expect(__getMockState().recurrenceDays).toEqual([31]);
      expect(fetched.id).toBe(charge.id);
    });
  });
});
