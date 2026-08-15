/**
 * POST /api/me/pix — valida a chave no Asaas/DICT (R$0,01 REAL) e grava.
 * Backend: `POST /api/v1/collaborators/candidate/pix`. Devolve `me_dict`.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const me = await djangoFetch("/api/v1/collaborators/candidate/pix", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(me);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao validar a chave Pix.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
