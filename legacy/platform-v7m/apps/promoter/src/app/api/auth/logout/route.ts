/** POST /api/auth/logout — limpa os cookies de sessão. */
import { NextResponse } from "next/server";

import { clearAuthCookies } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
