/**
 * ⚠️ MOCK ONLY — adapter em memória para demo e testes.
 *
 * Simula a fronteira do servidor e do provedor de pagamento. Este arquivo não
 * pode ser importado por builds de produção: não há persistência durável,
 * assinatura de webhook nem integração bancária real.
 */

import {
  type Charge,
  type ChargeRequest,
  type ChargeStatus,
  type DizimoApi,
  type WebhookEvent,
  type WebhookEventType,
  DizimoError,
  normalizeDayOfMonth,
  validateChargeRequest,
} from './contract';
import { z } from 'zod';

interface IdempotencyRecord {
  readonly fingerprint: string;
  readonly result: Promise<Charge>;
}

interface MockTiming {
  readonly networkDelayMs?: number;
  readonly webhookDelayMs?: number;
}

interface MockState {
  readonly charges: ReadonlyMap<string, Charge>;
  readonly recurrences: ReadonlyMap<
    string,
    { readonly day_of_month: number; readonly canceled: boolean }
  >;
  readonly idempotencyRecords: ReadonlyMap<string, IdempotencyRecord>;
  readonly webhookSubscribers: ReadonlySet<(event: WebhookEvent) => void>;
  readonly webhookTimers: ReadonlySet<ReturnType<typeof globalThis.setTimeout>>;
  readonly failureRate: number;
  readonly timeoutRate: number;
  readonly timing: MockTiming;
}

function initialState(): MockState {
  return {
    charges: new Map(),
    recurrences: new Map(),
    idempotencyRecords: new Map(),
    webhookSubscribers: new Set(),
    webhookTimers: new Set(),
    failureRate: 0,
    timeoutRate: 0,
    timing: {},
  };
}

let state = initialState();

function updateState(patch: Partial<MockState>): void {
  state = { ...state, ...patch };
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function delay(min: number, max: number): Promise<void> {
  const configured = state.timing.networkDelayMs;
  const ms = configured ?? min + Math.random() * (max - min);
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function shouldFail(rate: number): boolean {
  return Math.random() < rate;
}

function nowIso(): string {
  return new Date().toISOString();
}

function inMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function cloneCharge(charge: Charge): Charge {
  return {
    ...charge,
    payment: {
      pix: charge.payment.pix ? { ...charge.payment.pix } : undefined,
      card: charge.payment.card ? { ...charge.payment.card } : undefined,
    },
  };
}

function snapshotRequest(request: ChargeRequest): ChargeRequest {
  return {
    ...request,
    recurrence: { ...request.recurrence },
    donor: request.donor ? { ...request.donor } : undefined,
    metadata: request.metadata ? { ...request.metadata } : undefined,
  };
}

function requestFingerprint(request: ChargeRequest): string {
  const sortedMetadata = Object.entries(request.metadata ?? {}).sort(
    ([left], [right]) => left.localeCompare(right),
  );

  return JSON.stringify({
    amount_cents: request.amount_cents,
    method: request.method,
    recurrence: {
      enabled: request.recurrence.enabled,
      day_of_month: request.recurrence.day_of_month,
      interval: request.recurrence.interval,
    },
    donor: request.donor
      ? {
          name: request.donor.name,
          email: request.donor.email,
          cpf: request.donor.cpf ?? null,
        }
      : null,
    metadata: sortedMetadata,
  });
}

function validateIdempotencyKey(key: string): DizimoError | undefined {
  const uuidV4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidV4.test(key)) {
    return new DizimoError(
      'INVALID_IDEMPOTENCY_KEY',
      'A chave de idempotência deve ser um UUID v4 válido.',
      { status: 400 },
    );
  }
  return undefined;
}

const metadataSchema = z.record(z.string(), z.string());
const mockServerChargeRequestSchema = z
  .object({
    idempotency_key: z.string(),
    amount_cents: z.number().int().safe(),
    method: z.enum(['pix', 'cartao']),
    recurrence: z.discriminatedUnion('enabled', [
      z.object({
        enabled: z.literal(true),
        day_of_month: z.number().int(),
        interval: z.literal('monthly'),
      }),
      z.object({
        enabled: z.literal(false),
        day_of_month: z.number().int(),
        interval: z.literal('none'),
      }),
    ]),
    donor: z.object({
      name: z.string(),
      email: z.string(),
      cpf: z.string().optional(),
    }),
    metadata: metadataSchema.optional(),
  })
  .strict();

/** ⚠️ MOCK ONLY — simula validação independente na fronteira do servidor. */
function mockServerValidateChargeRequest(request: ChargeRequest): void {
  const parsed = mockServerChargeRequestSchema.safeParse(request);
  if (!parsed.success) {
    throw new DizimoError(
      'INVALID_REQUEST',
      'O formato do request é inválido.',
      { status: 400 },
    );
  }
  const errors = validateChargeRequest(request);
  const idempotencyError = validateIdempotencyKey(request.idempotency_key);
  const firstError = idempotencyError ?? errors[0];

  if (firstError) {
    throw firstError;
  }
}

/** ⚠️ MOCK ONLY — gera um SVG visual; não é um QR Pix bancário válido. */
function generateMockQrPayload(txid: string, size = 240): string {
  let seed = 0;
  for (let index = 0; index < txid.length; index += 1) {
    seed = (seed * 31 + txid.charCodeAt(index)) | 0;
  }

  const random = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const modules = 25;
  const cell = size / modules;
  let cells = '';
  for (let y = 0; y < modules; y += 1) {
    for (let x = 0; x < modules; x += 1) {
      const isFiducial =
        (x < 7 && y < 7) ||
        (x >= modules - 7 && y < 7) ||
        (x < 7 && y >= modules - 7);
      if (isFiducial) {
        const localX = x < 7 ? x : x - (modules - 7);
        const localY = y < 7 ? y : y - (modules - 7);
        const isOuter =
          localX === 0 || localX === 6 || localY === 0 || localY === 6;
        const isInner =
          localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4;
        if (isOuter || isInner) {
          cells += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#0B0B0B"/>`;
        }
        continue;
      }
      if (random() > 0.5) {
        cells += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#0B0B0B"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR Code para pagamento Pix"><rect width="${size}" height="${size}" fill="#F4EFE6"/><rect x="0" y="0" width="${size}" height="${size}" fill="none" stroke="#D2B264" stroke-width="0.5"/>${cells}</svg>`;
}

/** ⚠️ MOCK ONLY — texto ilustrativo; o BR Code real vem do provedor Pix. */
function generateMockCopyPaste(txid: string, amountCents: number): string {
  const amount = (amountCents / 100).toFixed(2);
  return `00020126580014BR.GOV.BCB.PIX0136${txid}@ieadpg.org.br5204000053039865802BR5913IEADPG AMALIA6009PONTA GROSSA62070503***6304${amount.length.toString().padStart(2, '0')}${amount}`;
}

function safeErrorDetails(error: unknown): Readonly<Record<string, unknown>> {
  if (error instanceof DizimoError) {
    return { error_code: error.code, status: error.status };
  }
  return { error_code: 'UNKNOWN_ERROR' };
}

function debugLog(
  operation: keyof DizimoApi,
  phase: 'input' | 'success' | 'error',
  details: Readonly<Record<string, unknown>>,
): void {
  if (import.meta.env.DEV) {
    console.debug('[dizimoApi]', { operation, phase, ...details });
  }
}

function safePaymentMethod(value: unknown): 'pix' | 'cartao' | 'invalid' {
  return value === 'pix' || value === 'cartao' ? value : 'invalid';
}

function safeAmount(value: unknown): number | 'invalid' {
  return typeof value === 'number' && Number.isFinite(value) ? value : 'invalid';
}

function safeCreateChargeInput(
  value: unknown,
): Readonly<{ amount_cents: number | 'invalid'; method: 'pix' | 'cartao' | 'invalid' }> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { amount_cents: 'invalid', method: 'invalid' };
  }
  const request = value as Readonly<Record<string, unknown>>;
  return {
    amount_cents: safeAmount(request.amount_cents),
    method: safePaymentMethod(request.method),
  };
}

function safeResourceId(value: unknown, prefix: 'ch' | 'recur'): string {
  return typeof value === 'string' && new RegExp(`^${prefix}_[a-z0-9]+$`, 'i').test(value)
    ? value
    : 'invalid';
}

function emitWebhook(event: WebhookEvent): void {
  state.webhookSubscribers.forEach((subscriber) => {
    try {
      subscriber(event);
    } catch (error: unknown) {
      debugLog('onWebhookEvent', 'error', safeErrorDetails(error));
    }
  });
}

function removeWebhookTimer(
  timer: ReturnType<typeof globalThis.setTimeout>,
): void {
  const nextTimers = new Set(state.webhookTimers);
  nextTimers.delete(timer);
  updateState({ webhookTimers: nextTimers });
}

function schedulePaymentWebhook(chargeId: string): void {
  const delayMs =
    state.timing.webhookDelayMs ?? 5000 + Math.random() * 10000;
  const timer = globalThis.setTimeout(() => {
    removeWebhookTimer(timer);
    const current = state.charges.get(chargeId);
    if (!current || !['pending', 'processing'].includes(current.status)) return;

    const random = Math.random();
    let nextStatus: ChargeStatus;
    let eventType: WebhookEventType;
    if (random < 0.9) {
      nextStatus = 'paid';
      eventType = 'charge.paid';
    } else if (random < 0.95) {
      nextStatus = 'failed';
      eventType = 'charge.failed';
    } else {
      nextStatus = 'expired';
      eventType = 'charge.expired';
    }

    const updated: Charge = { ...current, status: nextStatus };
    updateState({
      charges: new Map(state.charges).set(chargeId, updated),
    });
    emitWebhook({
      type: eventType,
      charge_id: chargeId,
      recurrence_id: current.recurrence_id,
      idempotency_key: uid('evt'),
      timestamp: nowIso(),
    });
  }, delayMs);

  updateState({
    webhookTimers: new Set(state.webhookTimers).add(timer),
  });
}

async function performMockCreateCharge(request: ChargeRequest): Promise<Charge> {
  // ⚠️ MOCK ONLY — representa a revalidação que o backend deve fazer sempre.
  mockServerValidateChargeRequest(request);
  await delay(300, 800);

  if (shouldFail(state.failureRate)) {
    throw new DizimoError(
      'PROVIDER_ERROR',
      'O provedor de pagamento retornou um erro. Tente novamente.',
      { status: 502 },
    );
  }
  if (shouldFail(state.timeoutRate)) {
    await delay(5500, 6000);
    throw new DizimoError(
      'PROVIDER_TIMEOUT',
      'O provedor de pagamento demorou demais. Tente novamente.',
      { status: 504 },
    );
  }

  let recurrenceId: string | undefined;
  if (request.recurrence.enabled) {
    recurrenceId = uid('recur');
    updateState({
      recurrences: new Map(state.recurrences).set(recurrenceId, {
        day_of_month: normalizeDayOfMonth(request.recurrence.day_of_month),
        canceled: false,
      }),
    });
  }

  const chargeId = uid('ch');
  const isPix = request.method === 'pix';
  const charge: Charge = {
    id: chargeId,
    status: 'pending',
    amount_cents: request.amount_cents,
    method: request.method,
    recurrence_id: recurrenceId,
    created_at: nowIso(),
    expires_at: inMinutes(isPix ? 60 : 30),
    payment: isPix
      ? {
          pix: {
            qr_code_payload: generateMockQrPayload(chargeId),
            copy_paste: generateMockCopyPaste(chargeId, request.amount_cents),
            txid: chargeId,
          },
        }
      : {
          card: {
            redirect_url: `/dizimo/card-checkout?charge=${chargeId}`,
            session_id: uid('sess'),
          },
        },
  };

  updateState({ charges: new Map(state.charges).set(chargeId, charge) });
  schedulePaymentWebhook(chargeId);
  return charge;
}

function removeFailedIdempotencyRecord(
  key: string,
  result: Promise<Charge>,
): void {
  const current = state.idempotencyRecords.get(key);
  if (current?.result !== result) return;

  const nextRecords = new Map(state.idempotencyRecords);
  nextRecords.delete(key);
  updateState({ idempotencyRecords: nextRecords });
}

function createChargeIdempotently(request: ChargeRequest): Promise<Charge> {
  // Valida antes de clonar/fingerprintar para que payload malformado nunca
  // escape como TypeError genérico na fronteira simulada.
  mockServerValidateChargeRequest(request);
  const snapshot = snapshotRequest(request);
  const fingerprint = requestFingerprint(snapshot);
  const existing = state.idempotencyRecords.get(snapshot.idempotency_key);

  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      return Promise.reject(
        new DizimoError(
          'IDEMPOTENCY_CONFLICT',
          'A chave de idempotência já foi usada com outro request.',
          { status: 409 },
        ),
      );
    }
    return existing.result;
  }

  const result = performMockCreateCharge(snapshot).catch((error: unknown) => {
    removeFailedIdempotencyRecord(snapshot.idempotency_key, result);
    throw error;
  });
  updateState({
    idempotencyRecords: new Map(state.idempotencyRecords).set(
      snapshot.idempotency_key,
      { fingerprint, result },
    ),
  });
  return result;
}

export const dizimoApi: DizimoApi = {
  async createCharge(request: ChargeRequest): Promise<Charge> {
    const startedAt = Date.now();
    debugLog('createCharge', 'input', safeCreateChargeInput(request));
    try {
      const charge = await createChargeIdempotently(request);
      debugLog('createCharge', 'success', {
        charge_id: charge.id,
        amount_cents: charge.amount_cents,
        method: charge.method,
        duration_ms: Date.now() - startedAt,
      });
      return cloneCharge(charge);
    } catch (error: unknown) {
      debugLog('createCharge', 'error', {
        ...safeErrorDetails(error),
        duration_ms: Date.now() - startedAt,
      });
      throw error;
    }
  },

  async getCharge(id: string): Promise<Charge> {
    const startedAt = Date.now();
    debugLog('getCharge', 'input', { charge_id: safeResourceId(id, 'ch') });
    try {
      await delay(100, 250);
      const charge = state.charges.get(id);
      if (!charge) {
        throw new DizimoError('CHARGE_NOT_FOUND', 'Cobrança não encontrada.', {
          status: 404,
        });
      }
      debugLog('getCharge', 'success', {
        charge_id: charge.id,
        status: charge.status,
        duration_ms: Date.now() - startedAt,
      });
      return cloneCharge(charge);
    } catch (error: unknown) {
      debugLog('getCharge', 'error', {
        ...safeErrorDetails(error),
        duration_ms: Date.now() - startedAt,
      });
      throw error;
    }
  },

  async cancelRecurrence(id: string): Promise<void> {
    const startedAt = Date.now();
    debugLog('cancelRecurrence', 'input', {
      recurrence_id: safeResourceId(id, 'recur'),
    });
    try {
      await delay(150, 400);
      const recurrence = state.recurrences.get(id);
      if (!recurrence) {
        throw new DizimoError(
          'RECURRENCE_NOT_FOUND',
          'Recorrência não encontrada.',
          { status: 404 },
        );
      }
      updateState({
        recurrences: new Map(state.recurrences).set(id, {
          ...recurrence,
          canceled: true,
        }),
      });
      emitWebhook({
        type: 'recurrence.canceled',
        recurrence_id: id,
        idempotency_key: uid('evt'),
        timestamp: nowIso(),
      });
      debugLog('cancelRecurrence', 'success', {
        recurrence_id: id,
        duration_ms: Date.now() - startedAt,
      });
    } catch (error: unknown) {
      debugLog('cancelRecurrence', 'error', {
        ...safeErrorDetails(error),
        duration_ms: Date.now() - startedAt,
      });
      throw error;
    }
  },

  onWebhookEvent(callback: (event: WebhookEvent) => void): () => void {
    debugLog('onWebhookEvent', 'input', {});
    updateState({
      webhookSubscribers: new Set(state.webhookSubscribers).add(callback),
    });
    debugLog('onWebhookEvent', 'success', {
      subscriber_count: state.webhookSubscribers.size,
    });

    return () => {
      const subscribers = new Set(state.webhookSubscribers);
      subscribers.delete(callback);
      updateState({ webhookSubscribers: subscribers });
    };
  },
};

/** ⚠️ MOCK ONLY — configura taxa de falha para testes de resiliência. */
export function setFailureRate(rate: number): void {
  updateState({ failureRate: Math.max(0, Math.min(1, rate)) });
}

/** ⚠️ MOCK ONLY — configura taxa de timeout para testes de resiliência. */
export function setTimeoutRate(rate: number): void {
  updateState({ timeoutRate: Math.max(0, Math.min(1, rate)) });
}

/** ⚠️ MOCK ONLY — torna tempos determinísticos em testes. */
export function setMockTiming(timing: MockTiming): void {
  const normalize = (value: number | undefined): number | undefined =>
    value === undefined ? undefined : Math.max(0, value);
  updateState({
    timing: {
      networkDelayMs: normalize(timing.networkDelayMs),
      webhookDelayMs: normalize(timing.webhookDelayMs),
    },
  });
}

/** ⚠️ MOCK ONLY — reseta estado e cancela webhooks pendentes. */
export function __resetMockState(): void {
  state.webhookTimers.forEach((timer) => globalThis.clearTimeout(timer));
  state = initialState();
}

/** ⚠️ MOCK ONLY — snapshot agregado sem PII para asserções de teste. */
export function __getMockState(): {
  chargeCount: number;
  recurrenceCount: number;
  subscriberCount: number;
  idempotencyCount: number;
  recurrenceDays: number[];
} {
  return {
    chargeCount: state.charges.size,
    recurrenceCount: state.recurrences.size,
    subscriberCount: state.webhookSubscribers.size,
    idempotencyCount: state.idempotencyRecords.size,
    recurrenceDays: [...state.recurrences.values()].map(
      (recurrence) => recurrence.day_of_month,
    ),
  };
}
