import createClient, { type ClientOptions, type Middleware } from "openapi-fetch";
import type { paths, components, operations } from "./schema";

export type { paths, components, operations };

export type Schema<K extends keyof components["schemas"]> = components["schemas"][K];

export const RETRY_DELAYS_MS = [250, 900];
export const DEFAULT_API_TIMEOUT_MS = 12_000;

export interface TokenPair {
  access_token: string;
  refresh_token?: string;
  [key: string]: unknown;
}

export interface ApiClientConfig extends ClientOptions {
  getAccessToken?: () => string | null | undefined;
  getRefreshToken?: () => string | null | undefined;
  onTokenRefreshed?: (tokens: TokenPair) => void;
  onUnauthorized?: () => void;
  refreshEndpoint?: string;
  retryDelaysMs?: number[];
  timeoutMs?: number;
}

/**
 * Single-flight refresh mutex manager to eliminate concurrent 401 race conditions.
 */
export class TokenRefreshManager {
  private refreshPromise: Promise<TokenPair | null> | null = null;

  async refresh(
    refreshEndpoint: string,
    refreshToken: string,
    onTokenRefreshed?: (tokens: TokenPair) => void,
    timeoutMs: number = DEFAULT_API_TIMEOUT_MS,
  ): Promise<TokenPair | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const res = await fetch(refreshEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!res.ok) return null;
          const tokens = (await res.json()) as TokenPair;
          if (tokens?.access_token && onTokenRefreshed) {
            onTokenRefreshed(tokens);
          }
          return tokens;
        } catch {
          return null;
        }
      })().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }
}

/**
 * Resilient fetch wrapper with keep-alive socket reconnection retry for TypeError.
 */
export function createResilientFetch(
  retryDelaysMs: number[] = RETRY_DELAYS_MS,
  timeoutMs: number = DEFAULT_API_TIMEOUT_MS,
  customFetch: (input: Request) => Promise<Response> = fetch,
): (input: Request) => Promise<Response> {
  return async (input: Request): Promise<Response> => {
    const executeOnce = async (): Promise<Response> => {
      return customFetch(input);
    };

    for (const delay of retryDelaysMs) {
      try {
        return await executeOnce();
      } catch (err) {
        if (!(err instanceof TypeError)) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return executeOnce();
  };
}

/**
 * Creates a fully typed openapi-fetch client for the V7M API.
 */
export function createApiClient(config: ApiClientConfig = {}) {
  const {
    getAccessToken,
    getRefreshToken,
    onTokenRefreshed,
    onUnauthorized,
    refreshEndpoint,
    retryDelaysMs = RETRY_DELAYS_MS,
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
    baseUrl = "http://localhost:8000",
    fetch: baseFetch = fetch,
    ...restOptions
  } = config;

  const refreshManager = new TokenRefreshManager();
  const resilientFetch = createResilientFetch(retryDelaysMs, timeoutMs, baseFetch);

  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      if (getAccessToken) {
        const token = getAccessToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      }
      return request;
    },
    async onResponse({ response, request }) {
      if (response.status === 401) {
        if (getRefreshToken && refreshEndpoint) {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            const endpointUrl = refreshEndpoint.startsWith("http")
              ? refreshEndpoint
              : `${baseUrl}${refreshEndpoint.startsWith("/") ? refreshEndpoint : `/${refreshEndpoint}`}`;
            const newTokens = await refreshManager.refresh(
              endpointUrl,
              refreshToken,
              onTokenRefreshed,
              timeoutMs,
            );
            if (newTokens?.access_token) {
              const retryHeaders = new Headers(request.headers);
              retryHeaders.set("Authorization", `Bearer ${newTokens.access_token}`);
              const retryReq = new Request(request, { headers: retryHeaders });
              return resilientFetch(retryReq);
            }
          }
        }
        if (onUnauthorized) {
          onUnauthorized();
        }
      }
      return response;
    },
  };

  const client = createClient<paths>({
    baseUrl,
    fetch: resilientFetch,
    ...restOptions,
  });

  client.use(authMiddleware);

  return client;
}

export type V7MApiClient = ReturnType<typeof createApiClient>;

/**
 * Default global typed client.
 */
export const apiClient = createApiClient();

export * from "./web-bot-auth";
