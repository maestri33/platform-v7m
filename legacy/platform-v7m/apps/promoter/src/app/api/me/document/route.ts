/**
 * GET / PATCH /api/me/document — seção rica do doc + completion/correction de campos.
 * Backend: `/api/v1/collaborators/candidate/document` (GET/PATCH).
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await djangoFetch("/api/v1/collaborators/candidate/document");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao carregar o documento.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const me = await djangoFetch("/api/v1/collaborators/candidate/document", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return NextResponse.json(me);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao atualizar o documento.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
