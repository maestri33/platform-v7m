/**
 * Cliente HTTP server-side pro Django. Lê o access token do cookie `v7m_access`
 * e injeta como Bearer. **NUNCA** exposto ao client.
 *
 * Erros do Django saem como `{detail, code, …extra}` (CONVENTION §3 / api/base.py).
 * Aqui só repassamos — quem decide o status é o Django.
 */
import "server-only";

import { cookies } from "next/headers";

import { BACKEND_URL } from "./config";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setAuthCookies,
} from "../auth/cookies";

export type DjangoFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  /** Quando true, repassa o `Authorization: Bearer <access_token>` do cookie. Default: true. */
  authenticated?: boolean;
  /** Timeout em milissegundos para a requisição upstream. Default: 10000ms. */
  timeoutMs?: number;
};

export class DjangoError extends Error {
  readonly code?: string;
  readonly extra?: Record<string, unknown>;

  constructor(
    public status: number,
    public body: { detail: string; code: string; [k: string]: unknown },
  ) {
    super(`Django ${status} ${body.code}: ${String(body.detail)}`);
    this.code = body.code;
    this.extra = body as Record<string, unknown>;
  }
}

/** Mensagem de erro amigável para a UI. Régua do app dos alunos: mapeia status,
 *  códigos conhecidos e abort de rede — nunca expõe o stack bruto. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof DjangoError) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return "Sessão expirada. Entre novamente.";
      case "OTP_INVALID":
      case "OTP_EXPIRED":
        return "Código inválido ou expirado. Solicite outro.";
      case "NOT_FOUND":
      case "CANDIDATE_NOT_FOUND":
        return "Não encontrado.";
      case "FORBIDDEN_ROLE":
      case "NOT_HUB_COORDINATOR":
        return "Você não tem permissão para isso.";
      case "DESCRIPTION_REQUIRED":
        return "Preencha o motivo obrigatório.";
      default:
        return error.body.detail ?? "Não deu pra completar agora. Tente de novo.";
    }
  }
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return "Tempo esgotado. Verifique sua conexão e tente novamente.";
  }
  return "Não foi possível conectar. Verifique sua conexão e tente novamente.";
}

// Mutex de single-flight para evitar múltiplas rotações concorrentes do mesmo refresh token
let refreshPromise: Promise<string | null> | null = null;

export async function djangoFetch<T = unknown>(
  path: string,
  opts: DjangoFetchOptions = {},
): Promise<T> {
  const { authenticated = true, headers: extraHeaders, timeoutMs = 10_000, ...rest } = opts;

  function buildHeaders(access?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(extraHeaders ?? {}),
    };
    // NÃO carimbar Content-Type quando o body é FormData: o fetch precisa gerar o
    // boundary multipart sozinho. Carimbar `application/json` aqui quebra o upload
    // no Django (boundary perdido) — vale pros uploads de selfie/RG/diploma.
    if (rest.body && !headers["Content-Type"] && !(rest.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    if (authenticated && access) headers.Authorization = `Bearer ${access}`;
    return headers;
  }

  const cookieStore = authenticated ? await cookies() : null;
  const access = cookieStore?.get(ACCESS_COOKIE)?.value;

  let { res, body } = await rawFetch(path, rest, buildHeaders(access), timeoutMs);

  // Refresh-on-401 deduplicado: evita que chamadas paralelas invalidem o refresh token de uso único
  if (res.status === 401 && authenticated && cookieStore) {
    const newAccess = await tryRefreshDeduplicated(cookieStore);
    if (newAccess) {
      ({ res, body } = await rawFetch(path, rest, buildHeaders(newAccess), timeoutMs));
    }
  }

  if (!res.ok) {
    throw new DjangoError(res.status, normalizeErrorBody(body, res.statusText));
  }
  return body as T;
}

/** Uma ida ao Django (sem retry). Lê o corpo como texto e tenta JSON. */
async function rawFetch(
  path: string,
  rest: Omit<DjangoFetchOptions, "headers" | "authenticated" | "timeoutMs">,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<{ res: Response; body: unknown }> {
  const backend = BACKEND_URL;
  const res = await fetch(`${backend}${path}`, {
    ...rest,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  const body: unknown = text ? safeJson(text) : null;
  return { res, body };
}

/**
 * Rotaciona o par de tokens com o refresh do cookie (com deduplicação de chamadas concorrentes).
 */
async function tryRefreshDeduplicated(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<string | null> {
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/collaborators/auth/refresh`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return null;
      const text = await res.text();
      const data = text ? (safeJson(text) as Record<string, unknown>) : null;
      const accessToken = data?.access_token;
      const refreshToken = data?.refresh_token;
      if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
        return null;
      }
      try {
        await setAuthCookies(accessToken, refreshToken);
      } catch {
        // render de Server Component não pode setar cookie — segue com o access novo
      }
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isErrorBody(x: unknown): x is { detail: unknown; code: string; [k: string]: unknown } {
  return (
    typeof x === "object" &&
    x !== null &&
    "detail" in x &&
    "code" in x
  );
}

/**
 * Garante `detail` STRING no corpo do erro. No 422 do Ninja (VALIDATION_ERROR)
 * `detail` é uma LISTA de erros Pydantic (`{type, loc, msg}`).
 */
function normalizeErrorBody(
  x: unknown,
  statusText: string,
): { detail: string; code: string; [k: string]: unknown } {
  const fallbackText = statusText.trim() || "Erro de comunicação com o servidor.";
  if (!isErrorBody(x)) return { detail: fallbackText, code: "ERROR" };
  if (typeof x.detail === "string") {
    return { ...x, detail: x.detail.trim() || fallbackText };
  }
  return {
    ...x,
    detail: "Alguns dados não passaram na validação. Confira e tente de novo.",
    errors: x.detail,
  };
}
