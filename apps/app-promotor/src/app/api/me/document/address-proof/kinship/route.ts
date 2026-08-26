/**
 * POST /api/me/document/address-proof/kinship — o comprovante está no nome de outra pessoa
 * (needs_kinship); a pessoa explica o parentesco. Backend:
 * POST /api/v1/collaborators/candidate/documents/address-proof/kinship {relation}.
 * O backend (evaluate_kinship) avalia o FUNDAMENTO e corrige o português antes de salvar.
 */
import { NextResponse } from "next/server";

import { djangoFetch } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { relation } = (await req.json()) as { relation?: string };
    if (!relation || !relation.trim()) {
      return NextResponse.json(
        { detail: "Diga quem é o titular e o parentesco.", code: "DESCRIPTION_REQUIRED" },
        { status: 422 },
      );
    }
    const out = await djangoFetch(
      "/api/v1/collaborators/candidate/documents/address-proof/kinship",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relation: relation.trim() }),
      },
    );
    return NextResponse.json(out);
  } catch (err) {
    return djangoErrorResponse(err);
  }
}
