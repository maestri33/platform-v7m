import { describe, expect, it, vi } from 'vitest';
import type { ChargeRequest } from '../contract';
import { createHttpDizimoApi } from '../httpDizimoApi';

const REQUEST: ChargeRequest = {
  idempotency_key: '123e4567-e89b-42d3-a456-426614174000',
  amount_cents: 10000,
  method: 'pix',
  recurrence: { enabled: true, day_of_month: 22, interval: 'monthly' },
  donor: { name: 'Maria da Silva', email: 'maria@example.com' },
};

const CHARGE = {
  id: 'ch_http_public',
  status: 'pending',
  amount_cents: 10000,
  method: 'pix',
  created_at: '2026-08-13T00:00:00.000Z',
  expires_at: '2026-08-13T01:00:00.000Z',
  payment: {
    pix: {
      qr_code_payload: '000201010212',
      copy_paste: '000201010212',
      txid: 'tx_http_public',
    },
  },
};

describe('httpDizimoApi — fronteira HTTP real', () => {
  it('cria cobrança no backend e transporta a chave idempotente no header', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: CHARGE }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const api = createHttpDizimoApi({ baseUrl: '/api/dizimo', fetcher });

    await expect(api.createCharge(REQUEST)).resolves.toEqual(CHARGE);
    expect(fetcher).toHaveBeenCalledWith(
      '/api/dizimo/charges',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Idempotency-Key': REQUEST.idempotency_key,
        }),
        body: JSON.stringify(REQUEST),
      }),
    );
  });

  it('rejeita redirect_url executável recebido do backend', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            ...CHARGE,
            method: 'cartao',
            payment: {
              card: {
                redirect_url: 'javascript:alert(1)',
                session_id: 'opaque',
              },
            },
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const api = createHttpDizimoApi({ fetcher });

    await expect(api.createCharge({ ...REQUEST, method: 'cartao' })).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
    });
  });

  it('rejeita redirect relativo que normaliza para outra origem', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            ...CHARGE,
            method: 'cartao',
            payment: {
              card: {
                redirect_url: '/\\evil.example.test/checkout',
                session_id: 'opaque',
              },
            },
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const api = createHttpDizimoApi({ fetcher });

    await expect(api.createCharge({ ...REQUEST, method: 'cartao' })).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
    });
  });

  it('aborta request pendente no limite configurado', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(
        (_url: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          }),
      );
      const api = createHttpDizimoApi({ fetcher, requestTimeoutMs: 25 });

      const assertion = expect(api.createCharge(REQUEST)).rejects.toMatchObject({
        code: 'PROVIDER_TIMEOUT',
      });
      await vi.advanceTimersByTimeAsync(25);

      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('usa EventSource injetado mesmo quando não existe implementação global', () => {
    const listeners = new Map<string, EventListener>();
    const source = {
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners.set(type, listener);
      }),
      removeEventListener: vi.fn(),
      close: vi.fn(),
    } as unknown as EventSource;
    const eventSourceFactory = vi.fn().mockReturnValue(source);
    const api = createHttpDizimoApi({ eventSourceFactory });
    const callback = vi.fn();

    const unsubscribe = api.onWebhookEvent(callback);
    expect(eventSourceFactory).toHaveBeenCalledWith('/api/dizimo/events');
    expect(listeners.has('message')).toBe(true);

    unsubscribe();
    expect(source.close).toHaveBeenCalledTimes(1);
  });
});
