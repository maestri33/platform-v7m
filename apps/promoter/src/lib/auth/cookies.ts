/**
 * Helpers de cookie (server-side). Nomes, atributos e ciclo de vida:
 * - `v7m_access` — Bearer que vai em **toda** request ao Django.
 * - `v7m_refresh` — trocado em `/api/auth/refresh` quando o access expira.
 * **NUNCA** expor ao client (HttpOnly). `Secure` só em produção (dev = http).
 */
import "server-only";

import { cookies } from "next/headers";

import { isProd } from "../api/config";

export const ACCESS_COOKIE = "v7m_access";
export const REFRESH_COOKIE = "v7m_refresh";

const MAX_AGE_ACCESS = 60 * 15; // 15 min (espelha o JWT do Django)
const MAX_AGE_REFRESH = 60 * 60 * 24 * 14; // 14 dias

function commonOpts(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function setAuthCookies(access: string, refresh: string) {
  const c = await cookies();
  c.set(ACCESS_COOKIE, access, commonOpts(MAX_AGE_ACCESS));
  c.set(REFRESH_COOKIE, refresh, commonOpts(MAX_AGE_REFRESH));
}

export async function clearAuthCookies() {
  const c = await cookies();
  c.delete(ACCESS_COOKIE);
  c.delete(REFRESH_COOKIE);
}

export async function readAccessToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(ACCESS_COOKIE)?.value ?? null;
}
