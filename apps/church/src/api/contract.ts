/**
 * Contrato público do módulo de dízimo.
 * Provider-agnostic — o mock em `./dizimoApi` pode ser substituído por
 * Pagar.me, Mercado Pago, Asaas, Stripe, etc., sem alterar componentes.
 *
 * Convenções:
 * - Valores monetários sempre em `cents` (inteiro) — evita float drift.
 * - Datas sempre em ISO 8601 UTC.
 * - Erros tipados via `DizimoError` com `code` discriminável.
 */
import { z } from 'zod';

// ─── Tipos de domínio ────────────────────────────────────────────────────────

export type PaymentMethod = 'pix' | 'cartao';

export type RecurrenceInterval = 'monthly' | 'none';

export type ChargeStatus =
  | 'pending' // criada, aguardando pagamento
  | 'processing' // pagamento iniciado, sem confirmação ainda
  | 'paid' // paga (webhook)
  | 'failed' // falhou (webhook ou timeout)
  | 'expired'; // tempo esgotou sem pagamento

export type WebhookEventType =
  | 'charge.paid'
  | 'charge.failed'
  | 'charge.expired'
  | 'recurrence.created'
  | 'recurrence.canceled';

// ─── Request / Response ──────────────────────────────────────────────────────

export interface DonorInfo {
  name: string;
  email: string;
  cpf?: string;
}

export interface RecurrenceConfig {
  enabled: boolean;
  /** Dia do mês (1–31). Será validado e normalizado. */
  day_of_month: number;
  interval: RecurrenceInterval;
}

export interface ChargeRequest {
  /** UUID v4 estável para a tentativa lógica; deve ser reutilizado em retries. */
  idempotency_key: string;
  amount_cents: number;
  method: PaymentMethod;
  recurrence: RecurrenceConfig;
  /** Opcional no MVP — pode ser exigido pelo backend em produção. */
  donor?: DonorInfo;
  metadata?: Record<string, string>;
}

export interface PixPaymentData {
  /** Payload opaco do QR: SVG, data URL ou URL HTTPS, conforme o adapter. */
  qr_code_payload: string;
  /** BR Code (cópia-cola) para apps de banco. */
  copy_paste: string;
  /** Recibo/transaction id exibido ao doador. */
  txid: string;
}

export interface CardPaymentData {
  /** URL do provedor de pagamento (Pagar.me, Stripe, etc.) para checkout. */
  redirect_url: string;
  /** Token opaco da transação — útil pra tracking. */
  session_id: string;
}

export interface Charge {
  id: string;
  status: ChargeStatus;
  amount_cents: number;
  method: PaymentMethod;
  /** Preenchido quando recurrence.enabled = true. */
  recurrence_id?: string;
  created_at: string;
  expires_at: string;
  payment: {
    pix?: PixPaymentData;
    card?: CardPaymentData;
  };
}

export interface WebhookEvent {
  type: WebhookEventType;
  /** Ausente em eventos que pertencem somente à recorrência. */
  charge_id?: string;
  recurrence_id?: string;
  /** Identidade única do evento para deduplicação at-least-once. */
  idempotency_key: string;
  timestamp: string;
}

// ─── API client ──────────────────────────────────────────────────────────────

export interface DizimoApi {
  createCharge(req: ChargeRequest): Promise<Charge>;
  getCharge(id: string): Promise<Charge>;
  cancelRecurrence(id: string): Promise<void>;
  /**
   * Assina eventos de webhook simulados. Retorna função de unsubscribe.
   * Em produção, isto seria substituído por um EventSource / WebSocket.
   */
  onWebhookEvent(callback: (event: WebhookEvent) => void): () => void;
}

// ─── Erros tipados ───────────────────────────────────────────────────────────

export type DizimoErrorCode =
  | 'INVALID_REQUEST' // payload malformado na fronteira runtime
  | 'INVALID_AMOUNT' // < 100 cents
  | 'INVALID_DAY' // < 1 ou > 31
  | 'INVALID_EMAIL' // email vazio ou inválido
  | 'INVALID_NAME' // nome vazio
  | 'INVALID_IDEMPOTENCY_KEY' // ausente ou fora do formato UUID v4
  | 'IDEMPOTENCY_CONFLICT' // mesma chave usada com outro request
  | 'NETWORK_ERROR' // falha de rede simulada
  | 'PROVIDER_TIMEOUT' // provedor demorou demais
  | 'PROVIDER_ERROR' // erro 5xx do provedor
  | 'CHARGE_NOT_FOUND'
  | 'CHARGE_EXPIRED'
  | 'RECURRENCE_NOT_FOUND';

export class DizimoError extends Error {
  readonly code: DizimoErrorCode;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(
    code: DizimoErrorCode,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'DizimoError';
    this.code = code;
    this.status = options.status;
    this.cause = options.cause;
  }

  /** Erro é recuperável pelo usuário (ex: re-tentar com dados corrigidos)? */
  isRecoverable(): boolean {
    return this.isRetryable() || this.isUserActionable();
  }

  /** A mesma operação pode ser repetida sem alterar os dados enviados? */
  isRetryable(): boolean {
    return [
      'NETWORK_ERROR',
      'PROVIDER_TIMEOUT',
      'PROVIDER_ERROR',
    ].includes(this.code);
  }

  /** O doador consegue corrigir o erro alterando os dados ou reiniciando o fluxo? */
  isUserActionable(): boolean {
    return [
      'INVALID_AMOUNT',
      'INVALID_DAY',
      'INVALID_EMAIL',
      'INVALID_NAME',
    ].includes(this.code);
  }
}

// ─── Helpers públicos ────────────────────────────────────────────────────────

/** Normaliza `day_of_month` para o intervalo contratual 1–31. */
export function normalizeDayOfMonth(day: number): number {
  if (!Number.isFinite(day)) return 1;
  if (day < 1) return 1;
  if (day > 31) return 31;
  return Math.floor(day);
}

/** Validação rápida no client antes de chamar API. Retorna array de erros. */
export function validateChargeRequest(
  req: Partial<ChargeRequest>,
): DizimoError[] {
  const errors: DizimoError[] = [];

  if (!req.amount_cents || req.amount_cents < 100) {
    errors.push(
      new DizimoError('INVALID_AMOUNT', 'Valor mínimo é R$ 1,00.'),
    );
  }
  if (req.recurrence?.enabled) {
    const day = req.recurrence.day_of_month;
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      errors.push(
        new DizimoError(
          'INVALID_DAY',
          'Selecione um dia do mês entre 1 e 31.',
        ),
      );
    }
  }
  if (req.donor) {
    if (!req.donor.email || !z.string().email().safeParse(req.donor.email).success) {
      errors.push(new DizimoError('INVALID_EMAIL', 'Informe um e-mail válido.'));
    }
    if (!req.donor.name || req.donor.name.trim().length < 2) {
      errors.push(new DizimoError('INVALID_NAME', 'Informe seu nome completo.'));
    }
  }
  return errors;
}
