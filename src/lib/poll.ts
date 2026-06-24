/**
 * Polling helpers shared between the enrollment wizard (Fase 1) and the
 * student document flow (Fase 3). Every async AI verdict in the app goes
 * through `pollUntil` — keep the surface minimal and side-effect-free.
 */
import type { AnalysisAck } from "@/lib/api";
import { isSettledStatus, SETTLED_STATUSES } from "@/lib/validation";

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_MS = 60_000;

/** Re-exported for callers that only need the set (e.g. matricula/steps.tsx). */
export const SETTLED = SETTLED_STATUSES;

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function isSettled(status: string | null | undefined): boolean {
  return isSettledStatus(status);
}

/**
 * Polling bounds from the upload ack (`poll_after_ms`/`expires_at`), with safe
 * defaults if the server doesn't send them. The deadline is an absolute
 * timestamp (ms) so the caller can stop even if the loop blocks.
 */
export function ackPoll(ack: AnalysisAck | null | undefined): {
  intervalMs: number;
  deadlineMs: number;
} {
  const intervalMs =
    ack?.poll_after_ms && ack.poll_after_ms > 0 ? ack.poll_after_ms : POLL_INTERVAL_MS;
  const exp = ack?.expires_at ? Date.parse(ack.expires_at) : NaN;
  const deadlineMs = Number.isFinite(exp) ? exp : Date.now() + POLL_MAX_MS;
  return { intervalMs, deadlineMs };
}

/**
 * Poll `fetch` until `settled(value)` or the deadline passes. Always returns
 * the LAST value the fetch produced (even on timeout) so the caller can show
 * whatever state the server had when we gave up.
 */
export async function pollUntil<T>(
  fetch: () => Promise<T>,
  settled: (v: T) => boolean,
  opts: { intervalMs?: number; deadlineMs?: number } = {},
): Promise<T> {
  const intervalMs = opts.intervalMs ?? POLL_INTERVAL_MS;
  const deadlineMs = opts.deadlineMs ?? Date.now() + POLL_MAX_MS;
  let last = await fetch();
  while (!settled(last) && Date.now() < deadlineMs) {
    await sleep(intervalMs);
    last = await fetch();
  }
  return last;
}
