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
  if (error instanceof Error && error.name === "AbortError") {
    return "Tempo esgotado. Verifique sua conexão e tente novamente.";
  }
  return "Não foi possível conectar. Verifique sua conexão e tente novamente.";
}

export async function djangoFetch<T = unknown>(
  path: string,
  opts: DjangoFetchOptions = {},
): Promise<T> {
  const { authenticated = true, headers: extraHeaders, ...rest } = opts;

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

  let { res, body } = await rawFetch(path, rest, buildHeaders(access));

  // Refresh-on-401: o access (15 min) expira antes do refresh (14 dias). Ao tomar
  // 401 numa chamada autenticada, tentamos rotacionar o par UMA vez (com o cookie
  // v7m_refresh) e refazemos a chamada. Se o refresh falhar (refresh expirado ou
  // token_version subiu — ex.: pós-conclude), o 401 propaga: o layout cai pra "/"
  // (sessão nula) e os route handlers devolvem o code pro switch do client.
  if (res.status === 401 && authenticated && cookieStore) {
    const newAccess = await tryRefresh(cookieStore);
    if (newAccess) {
      ({ res, body } = await rawFetch(path, rest, buildHeaders(newAccess)));
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
  rest: Omit<DjangoFetchOptions, "headers" | "authenticated">,
  headers: Record<string, string>,
): Promise<{ res: Response; body: unknown }> {
  const res = await fetch(`${BACKEND_URL}${path}`, { ...rest, headers, cache: "no-store" });
  const text = await res.text();
  const body: unknown = text ? safeJson(text) : null;
  return { res, body };
}

/**
 * Rotaciona o par de tokens com o refresh do cookie (chama o Django direto, sem
 * passar por `djangoFetch` — evita recursão). Devolve o novo access em caso de
 * sucesso (e persiste o par novo, best-effort: `cookies().set` só funciona em
 * Route Handler/Server Action; durante o render de Server Component ele lança, mas
 * o access novo ainda serve pra refazer a chamada atual). `null` = refresh falhou.
 */
async function tryRefresh(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<string | null> {
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/collaborators/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
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
  }
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
 * `detail` é uma LISTA de erros Pydantic (`{type, loc, msg}`) — repassada crua,
 * ela chega no `setError()` dos forms e derruba a tela inteira (React #31,
 * "objects are not valid as a React child"). A lista original segue em `errors`.
 */
function normalizeErrorBody(
  x: unknown,
  statusText: string,
): { detail: string; code: string; [k: string]: unknown } {
  if (!isErrorBody(x)) return { detail: statusText, code: "ERROR" };
  if (typeof x.detail === "string") {
    return x as { detail: string; code: string; [k: string]: unknown };
  }
  return {
    ...x,
    detail: "Alguns dados não passaram na validação. Confira e tente de novo.",
    errors: x.detail,
  };
}
