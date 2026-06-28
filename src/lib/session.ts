/**
 * Lightweight client-side session cache (low sensitivity).
 * phone -> register flow. externalId (UUID) -> login flow. ref -> affiliate attribution
 * carried into register (only kept for new users; discarded when check finds the user).
 * Uses localStorage; all calls are safe to run before hydration (guarded).
 */
export interface SessionCache {
  phone: string;
  externalId: string | null;
  ref?: string | null;
}

const KEY = "supletivo.session";

export function saveSession(session: SessionCache): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function getSession(): SessionCache | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionCache;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  refreshTokenMemory = null;
  loginCache = { raw: null, value: null };
  window.localStorage.removeItem(KEY);
  window.localStorage.removeItem(LOGIN_KEY);
}

const LOGIN_KEY = "supletivo.login";

/** Fast-path cache do refresh token; hidratado do storage no 1º getRefreshToken pós-reload. */
let refreshTokenMemory: string | null = null;

/**
 * Raw /auth/login response (roles, token, ...). Shape still settling backend-side.
 * O refresh_token é PERSISTIDO junto (mesmo localStorage do access token): sem isso o
 * silent-refresh no 1º 401 morria após um reload (memória zerada) e deslogava o aluno.
 * O access token já mora aqui, então co-localizar o refresh não muda a postura de segurança.
 */
export function saveLogin(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const refresh = payload.refresh_token;
  if (typeof refresh === "string" && refresh.length > 0) {
    refreshTokenMemory = refresh;
  }
  window.localStorage.setItem(LOGIN_KEY, JSON.stringify(payload));
}

export function getLogin(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LOGIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/* ---- useSyncExternalStore helpers (referentially stable snapshots) ---- */

let loginCache: { raw: string | null; value: Record<string, unknown> | null } = {
  raw: null,
  value: null,
};

/** Stable snapshot of the stored login payload (for useSyncExternalStore). */
export function getLoginSnapshot(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(LOGIN_KEY);
  if (raw !== loginCache.raw) {
    let value: Record<string, unknown> | null = null;
    if (raw) {
      try {
        value = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        value = null;
      }
    }
    loginCache = { raw, value };
  }
  return loginCache.value;
}

export function getServerLoginSnapshot(): Record<string, unknown> | null {
  return null;
}

/** Re-render on cross-tab storage changes; same-tab writes happen before navigation. */
export function subscribeStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/** Bearer token from the stored login payload, if any. */
export function getAccessToken(): string | null {
  const login = getLogin();
  const token = login?.access_token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

/** Server snapshot for useSyncExternalStore(token). */
export function getServerAccessToken(): string | null {
  return null;
}

/**
 * Refresh token pro silent-refresh (api.ts). Lê da memória; se vazia (ex.: após reload),
 * hidrata do mesmo payload persistido do login — assim o refresh no 1º 401 sobrevive a reload.
 */
export function getRefreshToken(): string | null {
  if (refreshTokenMemory) return refreshTokenMemory;
  if (typeof window === "undefined") return null;
  const token = getLogin()?.refresh_token;
  if (typeof token === "string" && token.length > 0) {
    refreshTokenMemory = token;
    return token;
  }
  return null;
}

const CHECKOUT_KEY = "supletivo.checkout";

/** Checkout returned by register (CheckoutOut) — kept for the payment step. */
export function saveCheckout(checkout: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkout));
}

export function getCheckout(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CHECKOUT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}
