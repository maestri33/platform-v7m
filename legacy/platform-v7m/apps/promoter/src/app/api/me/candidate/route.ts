/**
 * GET /api/me/candidate — `me_dict` canônico (resume do wizard).
 * Backend: `GET /api/v1/collaborators/candidate/me` (role candidate).
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const me = await djangoFetch("/api/v1/collaborators/candidate/me");
    return NextResponse.json(me);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao carregar o candidato.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
