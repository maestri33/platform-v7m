/**
 * GET/POST /api/me/selfie — seção rica + upload multipart (async).
 * Backend: `/api/v1/collaborators/candidate/selfie` (GET/POST).
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await djangoFetch("/api/v1/collaborators/candidate/selfie");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao carregar a selfie.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const photo = form.get("photo");
    if (!(photo instanceof File)) {
      return NextResponse.json(
        { detail: "Campo 'photo' ausente.", code: "PHOTO_MISSING" },
        { status: 422 },
      );
    }
    // Campo upstream `file` — nome do parâmetro no Ninja (api/collaborators.py).
    const upstream = new FormData();
    upstream.append("file", photo, photo.name);
    const ack = await djangoFetch(
      "/api/v1/collaborators/candidate/selfie",
      { method: "POST", body: upstream as unknown as BodyInit },
    );
    return NextResponse.json(ack);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha no upload da selfie.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
