/**
 * GET/POST/PATCH /api/me/address — busca, cria por CEP, completa por campos.
 * Backend: `/api/v1/collaborators/candidate/address` (GET/POST/PATCH).
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await djangoFetch("/api/v1/collaborators/candidate/address");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao carregar o endereço.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { cep } = await req.json();
    const me = await djangoFetch("/api/v1/collaborators/candidate/address", {
      method: "POST",
      body: JSON.stringify({ cep }),
    });
    return NextResponse.json(me);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao buscar o CEP.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const me = await djangoFetch("/api/v1/collaborators/candidate/address", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return NextResponse.json(me);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao salvar o endereço.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
