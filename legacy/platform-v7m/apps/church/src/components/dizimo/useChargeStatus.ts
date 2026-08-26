import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Charge,
  ChargeStatus,
  DizimoApi,
  WebhookEvent,
} from '@/api/contract';

const TERMINAL_STATUSES = new Set<ChargeStatus>(['paid', 'failed', 'expired']);
const MAX_HANDLED_WEBHOOK_EVENTS = 64;
const WEBHOOK_EVENT_TYPES = new Set<WebhookEvent['type']>([
  'charge.paid',
  'charge.failed',
  'charge.expired',
  'recurrence.created',
  'recurrence.canceled',
]);
const STATUS_PRIORITY: Record<ChargeStatus, number> = {
  pending: 0,
  processing: 1,
  failed: 2,
  expired: 2,
  paid: 3,
};

export interface UseChargeStatusOptions {
  apiClient: DizimoApi;
  onPaid?: (charge: Charge) => void;
  onTerminal: (charge: Charge) => void;
  pollingIntervalMs?: number;
}

export interface ChargeStatusController {
  charge: Charge | null;
  isVerifying: boolean;
  verificationError: string | null;
  startTracking: (charge: Charge) => void;
  stopTracking: () => void;
  applyCharge: (charge: Charge) => Charge;
  verifyNow: () => Promise<void>;
  resetCharge: () => void;
}

export function reconcileCharge(
  current: Charge | null,
  incoming: Charge,
): Charge {
  if (!current || current.id !== incoming.id) return incoming;
  if (current.status === incoming.status) return { ...current, ...incoming };
  if (current.status === 'paid') return current;
  if (incoming.status === 'paid') return incoming;
  if (TERMINAL_STATUSES.has(current.status)) return current;
  return STATUS_PRIORITY[incoming.status] >= STATUS_PRIORITY[current.status]
    ? incoming
    : current;
}

function statusFromWebhook(event: WebhookEvent): ChargeStatus | null {
  switch (event.type) {
    case 'charge.paid':
      return 'paid';
    case 'charge.failed':
      return 'failed';
    case 'charge.expired':
      return 'expired';
    case 'recurrence.created':
    case 'recurrence.canceled':
      return null;
  }
}

function validatedWebhookEvent(
  value: unknown,
  chargeId: string,
): WebhookEvent | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const event = value as Readonly<Record<string, unknown>>;
  if (
    event.charge_id !== chargeId ||
    typeof event.idempotency_key !== 'string' ||
    event.idempotency_key.trim().length === 0 ||
    event.idempotency_key.length > 128 ||
    typeof event.type !== 'string' ||
    !WEBHOOK_EVENT_TYPES.has(event.type as WebhookEvent['type']) ||
    typeof event.timestamp !== 'string'
  ) {
    return null;
  }
  return event as unknown as WebhookEvent;
}

function rememberWebhookEvent(
  handledEvents: readonly string[],
  key: string,
): Readonly<{ accepted: boolean; events: readonly string[] }> {
  if (handledEvents.includes(key)) {
    return { accepted: false, events: handledEvents };
  }
  return {
    accepted: true,
    events: [...handledEvents, key].slice(-MAX_HANDLED_WEBHOOK_EVENTS),
  };
}

export function useChargeStatus({
  apiClient,
  onPaid,
  onTerminal,
  pollingIntervalMs = 4000,
}: UseChargeStatusOptions): ChargeStatusController {
  const [charge, setCharge] = useState<Charge | null>(null);
  const [tracking, setTracking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const chargeRef = useRef<Charge | null>(null);
  const handledEventsRef = useRef<readonly string[]>([]);
  const notifiedPaidRef = useRef(new Set<string>());
  const onPaidRef = useRef(onPaid);
  const onTerminalRef = useRef(onTerminal);
  const verifyingRef = useRef(false);

  useEffect(() => {
    onPaidRef.current = onPaid;
    onTerminalRef.current = onTerminal;
  }, [onPaid, onTerminal]);

  const applyCharge = useCallback((incoming: Charge): Charge => {
    const next = reconcileCharge(chargeRef.current, incoming);
    chargeRef.current = next;
    setCharge(next);
    if (TERMINAL_STATUSES.has(next.status)) {
      handledEventsRef.current = [];
      setTracking(false);
      onTerminalRef.current(next);
    }
    if (next.status === 'paid' && !notifiedPaidRef.current.has(next.id)) {
      notifiedPaidRef.current.add(next.id);
      onPaidRef.current?.(next);
    }
    return next;
  }, []);

  const startTracking = useCallback((nextCharge: Charge) => {
    if (chargeRef.current?.id !== nextCharge.id) {
      handledEventsRef.current = [];
      notifiedPaidRef.current = new Set();
    }
    chargeRef.current = nextCharge;
    setCharge(nextCharge);
    setVerificationError(null);
    setTracking(!TERMINAL_STATUSES.has(nextCharge.status));
  }, []);

  const stopTracking = useCallback(() => setTracking(false), []);

  const resetCharge = useCallback(() => {
    chargeRef.current = null;
    handledEventsRef.current = [];
    notifiedPaidRef.current = new Set();
    verifyingRef.current = false;
    setCharge(null);
    setTracking(false);
    setVerificationError(null);
  }, []);

  const verifyNow = useCallback(async () => {
    const current = chargeRef.current;
    if (!current || verifyingRef.current) return;
    verifyingRef.current = true;
    setIsVerifying(true);
    setVerificationError(null);
    try {
      applyCharge(await apiClient.getCharge(current.id));
    } catch {
      setVerificationError(
        'Não foi possível verificar agora. A confirmação automática continua ativa.',
      );
    } finally {
      verifyingRef.current = false;
      setIsVerifying(false);
    }
  }, [apiClient, applyCharge]);

  useEffect(() => {
    if (!tracking || !charge?.id) return;
    const chargeId = charge.id;
    const unsubscribe = apiClient.onWebhookEvent((unsafeEvent) => {
      const event = validatedWebhookEvent(unsafeEvent, chargeId);
      if (!event) return;
      const remembered = rememberWebhookEvent(
        handledEventsRef.current,
        event.idempotency_key,
      );
      handledEventsRef.current = remembered.events;
      if (!remembered.accepted) return;
      const status = statusFromWebhook(event);
      const current = chargeRef.current;
      if (status && current) applyCharge({ ...current, status });
    });
    return unsubscribe;
  }, [apiClient, applyCharge, charge?.id, tracking]);

  useEffect(() => {
    if (!tracking || !charge?.id) return;
    const chargeId = charge.id;
    const interval = globalThis.setInterval(() => {
      void apiClient.getCharge(chargeId).then(applyCharge).catch(() => undefined);
    }, pollingIntervalMs);
    return () => globalThis.clearInterval(interval);
  }, [apiClient, applyCharge, charge?.id, pollingIntervalMs, tracking]);

  return {
    charge,
    isVerifying,
    verificationError,
    startTracking,
    stopTracking,
    applyCharge,
    verifyNow,
    resetCharge,
  };
}
