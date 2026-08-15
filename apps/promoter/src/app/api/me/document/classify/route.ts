/**
 * POST /api/me/document/classify — classificação RÁPIDA da foto ANTES de enviar (multipart `file`).
 * Backend: POST /api/v1/collaborators/candidate/documents/classify. Só reconhece (é doc? rg/cnh?
 * inteiro/frente/verso?), NÃO valida — alimenta a orientação de UI. A validação minuciosa segue
 * assíncrona no upload da foto.
 */
import { NextResponse } from "next/server";

import { djangoFetch } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { detail: "Arquivo ausente.", code: "FILE_REQUIRED" },
        { status: 422 },
      );
    }
    const upstream = new FormData();
    upstream.append("file", file, "doc");
    const out = await djangoFetch(
      "/api/v1/collaborators/candidate/documents/classify",
      { method: "POST", body: upstream },
    );
    return NextResponse.json(out);
  } catch (err) {
    return djangoErrorResponse(err);
  }
}
