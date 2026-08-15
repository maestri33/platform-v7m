/** GET /api/me/whoami — eco do principal autenticado (prova o JWT). */
import { NextResponse } from "next/server";

import { djangoFetch } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await djangoFetch("/api/v1/collaborators/whoami");
    return NextResponse.json(data);
  } catch (err) {
    return djangoErrorResponse(err);
  }
}
