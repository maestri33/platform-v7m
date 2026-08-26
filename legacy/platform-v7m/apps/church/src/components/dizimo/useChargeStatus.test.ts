import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  Charge,
  ChargeStatus,
  DizimoApi,
  WebhookEvent,
} from '@/api/contract';
import { reconcileCharge, useChargeStatus } from './useChargeStatus';

function charge(status: ChargeStatus, id = 'ch_reconcile'): Charge {
  return {
    id,
    status,
    amount_cents: 10000,
    method: 'pix',
    created_at: '2026-08-13T00:00:00.000Z',
    expires_at: '2026-08-13T01:00:00.000Z',
    payment: {
      pix: {
        qr_code_payload: '<svg viewBox="0 0 1 1" />',
        copy_paste: 'pix-code',
        txid: 'tx_reconcile',
      },
    },
  };
}

function webhookHarness(): {
  apiClient: DizimoApi;
  emit: (event: WebhookEvent) => void;
} {
  let subscriber: ((event: WebhookEvent) => void) | undefined;
  return {
    apiClient: {
      createCharge: async () => {
        throw new Error('unused');
      },
      getCharge: async (id) => charge('pending', id),
      cancelRecurrence: async () => undefined,
      onWebhookEvent: (callback) => {
        subscriber = callback;
        return () => {
          if (subscriber === callback) subscriber = undefined;
        };
      },
    },
    emit: (event) => subscriber?.(event),
  };
}

describe('reconcileCharge', () => {
  it('não deixa polling pendente regredir confirmação recebida por webhook', () => {
    const paidByWebhook = charge('paid');
    const stalePolling = charge('pending');

    expect(reconcileCharge(paidByWebhook, stalePolling)).toBe(paidByWebhook);
  });

  it('aceita progressão de polling e prioriza confirmação paga', () => {
    const processing = reconcileCharge(charge('pending'), charge('processing'));
    const paid = reconcileCharge(processing, charge('paid'));

    expect(processing.status).toBe('processing');
    expect(paid.status).toBe('paid');
  });
});

describe('useChargeStatus — fronteira de webhook', () => {
  it('descarta evento sem idempotency_key', () => {
    const harness = webhookHarness();
    const onTerminal = vi.fn();
    const { result } = renderHook(() =>
      useChargeStatus({
        apiClient: harness.apiClient,
        onTerminal,
        pollingIntervalMs: 60_000,
      }),
    );

    act(() => result.current.startTracking(charge('pending')));
    act(() =>
      harness.emit({
        type: 'charge.paid',
        charge_id: 'ch_reconcile',
        timestamp: '2026-08-13T00:01:00.000Z',
      } as WebhookEvent),
    );

    expect(result.current.charge?.status).toBe('pending');
    expect(onTerminal).not.toHaveBeenCalled();
  });

  it('limita o histórico de deduplicação e aceita uma chave antiga já expirada', () => {
    const harness = webhookHarness();
    const { result } = renderHook(() =>
      useChargeStatus({
        apiClient: harness.apiClient,
        onTerminal: vi.fn(),
        pollingIntervalMs: 60_000,
      }),
    );

    act(() => result.current.startTracking(charge('pending')));
    act(() => {
      for (let index = 0; index < 65; index += 1) {
        harness.emit({
          type: 'recurrence.created',
          charge_id: 'ch_reconcile',
          recurrence_id: 'recur_test',
          idempotency_key: `evt-${index}`,
          timestamp: '2026-08-13T00:01:00.000Z',
        });
      }
      harness.emit({
        type: 'charge.paid',
        charge_id: 'ch_reconcile',
        idempotency_key: 'evt-0',
        timestamp: '2026-08-13T00:02:00.000Z',
      });
    });

    expect(result.current.charge?.status).toBe('paid');
  });

  it('isola a deduplicação por cobrança rastreada', () => {
    const harness = webhookHarness();
    const { result } = renderHook(() =>
      useChargeStatus({
        apiClient: harness.apiClient,
        onTerminal: vi.fn(),
        pollingIntervalMs: 60_000,
      }),
    );

    act(() => result.current.startTracking(charge('pending', 'ch_first')));
    act(() =>
      harness.emit({
        type: 'recurrence.created',
        charge_id: 'ch_first',
        recurrence_id: 'recur_first',
        idempotency_key: 'evt-shared',
        timestamp: '2026-08-13T00:01:00.000Z',
      }),
    );
    act(() => result.current.startTracking(charge('pending', 'ch_second')));
    act(() =>
      harness.emit({
        type: 'charge.paid',
        charge_id: 'ch_second',
        idempotency_key: 'evt-shared',
        timestamp: '2026-08-13T00:02:00.000Z',
      }),
    );

    expect(result.current.charge).toMatchObject({
      id: 'ch_second',
      status: 'paid',
    });
  });
});
