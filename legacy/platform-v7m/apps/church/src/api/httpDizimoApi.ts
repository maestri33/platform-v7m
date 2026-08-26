import { z } from 'zod';
import {
  DizimoError,
  type Charge,
  type DizimoApi,
  type DizimoErrorCode,
  type WebhookEvent,
} from './contract';

const SAME_ORIGIN_VALIDATION_BASE = 'https://dizimo.same-origin.invalid';

const safeRedirectUrl = z.string().refine((value) => {
  try {
    if (value.startsWith('/')) {
      const parsed = new URL(value, SAME_ORIGIN_VALIDATION_BASE);
      return parsed.origin === SAME_ORIGIN_VALIDATION_BASE;
    }
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      parsed.username === '' &&
      parsed.password === ''
    );
  } catch {
    return false;
  }
}, 'redirect_url deve ser HTTPS ou um caminho da mesma origem');

const pixPaymentSchema = z
  .object({
    qr_code_payload: z.string().min(1),
    copy_paste: z.string().min(1),
    txid: z.string().min(1),
  })
  .strict();

const cardPaymentSchema = z
  .object({
    redirect_url: safeRedirectUrl,
    session_id: z.string().min(1),
  })
  .strict();

const chargeSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(['pending', 'processing', 'paid', 'failed', 'expired']),
    amount_cents: z.number().int().positive(),
    method: z.enum(['pix', 'cartao']),
    recurrence_id: z.string().min(1).optional(),
    created_at: z.string().datetime({ offset: true }),
    expires_at: z.string().datetime({ offset: true }),
    payment: z
      .object({
        pix: pixPaymentSchema.optional(),
        card: cardPaymentSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((charge, context) => {
    const expectedPayment = charge.method === 'pix' ? charge.payment.pix : charge.payment.card;
    if (!expectedPayment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `payment.${charge.method === 'pix' ? 'pix' : 'card'} ausente`,
        path: ['payment'],
      });
    }
  });

const webhookEventSchema = z
  .object({
    type: z.enum([
      'charge.paid',
      'charge.failed',
      'charge.expired',
      'recurrence.created',
      'recurrence.canceled',
    ]),
    charge_id: z.string().min(1).optional(),
    recurrence_id: z.string().min(1).optional(),
    idempotency_key: z.string().min(1),
    timestamp: z.string().datetime({ offset: true }),
  })
  .strict();

const successEnvelopeSchema = z
  .object({ success: z.literal(true), data: z.unknown() })
  .strict();

const errorEnvelopeSchema = z
  .object({
    success: z.literal(false),
    error: z.object({ code: z.string(), message: z.string().min(1) }).strict(),
  })
  .strict();

const KNOWN_ERROR_CODES: ReadonlySet<DizimoErrorCode> = new Set([
  'INVALID_REQUEST',
  'INVALID_AMOUNT',
  'INVALID_DAY',
  'INVALID_EMAIL',
  'INVALID_NAME',
  'INVALID_IDEMPOTENCY_KEY',
  'IDEMPOTENCY_CONFLICT',
  'NETWORK_ERROR',
  'PROVIDER_TIMEOUT',
  'PROVIDER_ERROR',
  'CHARGE_NOT_FOUND',
  'CHARGE_EXPIRED',
  'RECURRENCE_NOT_FOUND',
]);

export interface HttpDizimoApiOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  eventSourceFactory?: (url: string) => EventSource;
  /** Tempo máximo de cada request; default 15 segundos. */
  requestTimeoutMs?: number;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function fallbackCode(status: number): DizimoErrorCode {
  if (status === 400) return 'INVALID_REQUEST';
  if (status === 409) return 'IDEMPOTENCY_CONFLICT';
  if (status === 504) return 'PROVIDER_TIMEOUT';
  return 'PROVIDER_ERROR';
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new DizimoError(
      'PROVIDER_ERROR',
      'O servidor retornou uma resposta inválida.',
      { status: response.status, cause },
    );
  }
}

function parseServerError(payload: unknown, status: number): DizimoError {
  const parsed = errorEnvelopeSchema.safeParse(payload);
  const reportedCode = parsed.success ? parsed.data.error.code : undefined;
  const code =
    reportedCode && KNOWN_ERROR_CODES.has(reportedCode as DizimoErrorCode)
      ? (reportedCode as DizimoErrorCode)
      : fallbackCode(status);
  return new DizimoError(
    code,
    parsed.success
      ? parsed.data.error.message
      : 'Não foi possível processar a contribuição.',
    { status },
  );
}

export function createHttpDizimoApi(
  options: HttpDizimoApiOptions = {},
): DizimoApi {
  const {
    baseUrl = '/api/dizimo',
    fetcher = (...args) => globalThis.fetch(...args),
    requestTimeoutMs = 15_000,
  } = options;
  const eventSourceFactory =
    options.eventSourceFactory ??
    ((url: string) => new EventSource(url, { withCredentials: true }));
  const canOpenEventSource =
    options.eventSourceFactory !== undefined ||
    typeof globalThis.EventSource !== 'undefined';
  const timeoutMs =
    Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0
      ? requestTimeoutMs
      : 15_000;
  const root = normalizeBaseUrl(baseUrl);

  async function performFetch(
    path: string,
    init?: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetcher(`${root}${path}`, {
        credentials: 'same-origin',
        ...init,
        signal: controller.signal,
      });
    } catch (cause) {
      if (controller.signal.aborted) {
        throw new DizimoError(
          'PROVIDER_TIMEOUT',
          'O servidor demorou demais para responder. Tente novamente.',
          { status: 504, cause },
        );
      }
      throw new DizimoError(
        'NETWORK_ERROR',
        'Não foi possível conectar ao servidor. Tente novamente.',
        { cause },
      );
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }

  async function requestCharge(path: string, init?: RequestInit): Promise<Charge> {
    const response = await performFetch(path, init);

    const payload = await readJson(response);
    if (!response.ok) throw parseServerError(payload, response.status);

    const envelope = successEnvelopeSchema.safeParse(payload);
    const parsedCharge = chargeSchema.safeParse(
      envelope.success ? envelope.data.data : payload,
    );
    if (!parsedCharge.success) {
      throw new DizimoError(
        'PROVIDER_ERROR',
        'O servidor retornou dados de pagamento inválidos.',
        { status: response.status, cause: parsedCharge.error },
      );
    }
    return parsedCharge.data;
  }

  return {
    createCharge(req) {
      return requestCharge('/charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': req.idempotency_key,
        },
        body: JSON.stringify(req),
      });
    },

    getCharge(id) {
      return requestCharge(`/charges/${encodeURIComponent(id)}`);
    },

    async cancelRecurrence(id) {
      const response = await performFetch(
        `/recurrences/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      if (response.ok) return;
      const payload = await readJson(response);
      throw parseServerError(payload, response.status);
    },

    onWebhookEvent(callback) {
      if (!canOpenEventSource) return () => undefined;
      const source = eventSourceFactory(`${root}/events`);
      const receive = (event: MessageEvent<string>) => {
        try {
          const parsed = webhookEventSchema.safeParse(JSON.parse(event.data));
          if (parsed.success) callback(parsed.data as WebhookEvent);
        } catch {
          // Evento inválido é descartado; polling continua como reconciliação.
        }
      };
      source.addEventListener('message', receive as EventListener);
      return () => {
        source.removeEventListener('message', receive as EventListener);
        source.close();
      };
    },
  };
}

export const httpDizimoApi = createHttpDizimoApi();
