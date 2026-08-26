/**
 * POST /api/me/document/address-proof — comprovante de residência, OBRIGATÓRIO:
 * o backend só avança profile→address com ele APROVADO pela IA (gate F1).
 * Backend: `POST /api/v1/collaborators/candidate/documents/address-proof`
 * (multipart `file`, JPEG/PNG/WEBP/PDF). Devolve o `me_dict` com o bloco
 * `address_proof` em `pending` — o veredito chega pelo poll do candidato.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { detail: "Campo 'file' ausente.", code: "FILE_MISSING" },
        { status: 422 },
      );
    }
    const upstream = new FormData();
    upstream.append("file", file, file.name);
    const ack = await djangoFetch(
      "/api/v1/collaborators/candidate/documents/address-proof",
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
