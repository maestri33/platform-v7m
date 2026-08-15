import { useCallback, useMemo, useRef, useState } from 'react';
import type { Charge, ChargeRequest, DizimoApi } from '@/api/contract';
import {
  DizimoError,
  normalizeDayOfMonth,
  validateChargeRequest,
} from '@/api/contract';
import type { DizimoFormState } from './DizimoForm';
import { useChargeStatus } from './useChargeStatus';

export type DizimoStep = 'form' | 'submitting' | 'payment' | 'status';

export interface UseDizimoCaptureOptions {
  apiClient: DizimoApi;
  defaultDayOfMonth: number;
  defaultAmountCents: number;
  onPaid?: (charge: Charge) => void;
}

function createIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Secure random UUID generation is unavailable.');
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10).join(''),
  ].join('-');
}

function initialForm(
  defaultDayOfMonth: number,
  defaultAmountCents: number,
): DizimoFormState {
  return {
    amountCents: defaultAmountCents,
    recurrenceEnabled: true,
    dayOfMonth: normalizeDayOfMonth(defaultDayOfMonth),
    method: null,
  };
}

export function useDizimoCapture({
  apiClient,
  defaultDayOfMonth,
  defaultAmountCents,
  onPaid,
}: UseDizimoCaptureOptions) {
  const [step, setStep] = useState<DizimoStep>('form');
  const [form, setForm] = useState(() =>
    initialForm(defaultDayOfMonth, defaultAmountCents),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const requestFingerprintRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  const handleTerminal = useCallback(() => setStep('status'), []);
  const chargeStatus = useChargeStatus({
    apiClient,
    onPaid,
    onTerminal: handleTerminal,
  });
  const {
    charge,
    isVerifying,
    resetCharge,
    startTracking,
    verificationError,
    verifyNow,
  } = chargeStatus;

  const validationErrors = useMemo(
    () =>
      validateChargeRequest({
        amount_cents: form.amountCents,
        recurrence: {
          enabled: form.recurrenceEnabled,
          day_of_month: form.dayOfMonth,
          interval: form.recurrenceEnabled ? 'monthly' : 'none',
        },
      }),
    [form],
  );
  const canSubmit =
    form.method !== null &&
    validationErrors.length === 0 &&
    form.amountCents >= 100;

  const submit = useCallback(async () => {
    if (!canSubmit || !form.method || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitError(null);
    setStep('submitting');
    const requestPayload: Omit<ChargeRequest, 'idempotency_key' | 'donor'> = {
      amount_cents: form.amountCents,
      method: form.method,
      recurrence: {
        enabled: form.recurrenceEnabled,
        day_of_month: form.dayOfMonth,
        interval: form.recurrenceEnabled ? 'monthly' : 'none',
      },
    };

    try {
      const fingerprint = JSON.stringify(requestPayload);
      if (requestFingerprintRef.current !== fingerprint) {
        requestFingerprintRef.current = fingerprint;
        idempotencyKeyRef.current = createIdempotencyKey();
      }
      idempotencyKeyRef.current ??= createIdempotencyKey();
      const request: ChargeRequest = {
        ...requestPayload,
        idempotency_key: idempotencyKeyRef.current,
      };
      const createdCharge = await apiClient.createCharge(request);
      startTracking(createdCharge);
      setStep('payment');
    } catch (error) {
      setSubmitError(
        error instanceof DizimoError
          ? error.message
          : 'Não foi possível criar a cobrança. Tente novamente.',
      );
      setStep('form');
    } finally {
      submittingRef.current = false;
    }
  }, [apiClient, canSubmit, form, startTracking]);

  const newContribution = useCallback(() => {
    resetCharge();
    idempotencyKeyRef.current = null;
    requestFingerprintRef.current = null;
    setSubmitError(null);
    setStep('form');
  }, [resetCharge]);

  return {
    step,
    form,
    setForm,
    validationErrors,
    canSubmit,
    submitError,
    submit,
    charge,
    isVerifying,
    verificationError,
    verifyNow,
    newContribution,
  };
}
