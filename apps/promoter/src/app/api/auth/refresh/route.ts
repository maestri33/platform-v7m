/** POST /api/auth/refresh — rotaciona o par (lê refresh do cookie, seta novo par). */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type RefreshResponse = { access_token: string; refresh_token: string };

export async function POST() {
  const cookieStore = await cookies();
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json(
      { detail: "Sessão expirada — faça login novamente.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
  }
  try {
    const data = await djangoFetch<RefreshResponse>("/api/v1/collaborators/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
      authenticated: false,
    });
    await setAuthCookies(data.access_token, data.refresh_token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // refresh inválido/expirado → limpa cookies
    if (err instanceof DjangoError) {
      await clearAuthCookies();
    }
    return djangoErrorResponse(err);
  }
}
