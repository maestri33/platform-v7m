import { createApiClient } from "@v7m/api-client";
import { API_BASE_URL } from "@/lib/config";
import { clearSession, getAccessToken } from "@/lib/session";

/**
 * Global typed openapi-fetch client for the Next.js frontend,
 * preconfigured with the current session's JWT token and API_BASE_URL.
 */
export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => getAccessToken(),
  onUnauthorized: () => {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  },
});

export * from "@v7m/api-client";
