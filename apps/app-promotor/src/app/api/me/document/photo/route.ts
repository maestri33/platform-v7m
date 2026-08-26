/**
 * POST /api/me/document/photo — upload multipart (campo `photo` + `slot`).
 * Backend: `POST /api/v1/collaborators/candidate/documents/photo/{slot}` (multipart).
 *
 * Passamos `slot` no FormData para preservar a URL local. O backend infere o `doc_type`
 * do prefixo do slot (rg_*|cnh_*).
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

const VALID_SLOTS = new Set([
  "rg_front",
  "rg_back",
  "rg_full",
  "cnh_front",
  "cnh_back",
  "cnh_full",
]);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const slot = String(form.get("slot") ?? "");
    if (!VALID_SLOTS.has(slot)) {
      return NextResponse.json(
        { detail: `Slot inválido: ${slot}`, code: "SLOT_INVALID" },
        { status: 422 },
      );
    }
    const photo = form.get("photo");
    if (!(photo instanceof File)) {
      return NextResponse.json(
        { detail: "Campo 'photo' ausente.", code: "PHOTO_MISSING" },
        { status: 422 },
      );
    }
    // Repassa como novo FormData só com o file (o slot vai na URL). O campo
    // upstream chama `file` — nome do parâmetro no Ninja (api/collaborators.py);
    // qualquer outro nome vira 422 VALIDATION_ERROR.
    const upstream = new FormData();
    upstream.append("file", photo, photo.name);
    const ack = await djangoFetch(
      `/api/v1/collaborators/candidate/documents/photo/${slot}`,
      { method: "POST", body: upstream as unknown as BodyInit },
    );
    return NextResponse.json(ack);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha no upload.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
