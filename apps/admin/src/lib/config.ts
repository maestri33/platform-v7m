/**
 * API base URL for the browser. Empty = same-origin: requests hit /api/* on the
 * Next server, which proxies to the Django Ninja upstream (see next.config.ts rewrites).
 * This avoids CORS and mixed-content. Override only for special setups.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const API_TIMEOUT_MS = 12_000;
