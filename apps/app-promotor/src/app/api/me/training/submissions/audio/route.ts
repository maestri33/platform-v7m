/**
 * POST /api/me/training/submissions/audio — resposta em áudio (enfileira ai.grade).
 * Backend: `POST /api/v1/collaborators/training/submissions/audio` (multipart
 * `material_external_id` + `file`; mp3/m4a/aac/ogg/webm/wav, ≤10MB).
 * Códigos esperados: INVALID_AUDIO_TYPE, AUDIO_TOO_LARGE, ALREADY_GRADING (409).
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const materialExternalId = String(form.get("material_external_id") ?? "");
    const file = form.get("file");
    if (!materialExternalId) {
      return NextResponse.json(
        { detail: "Campo 'material_external_id' ausente.", code: "MATERIAL_MISSING" },
        { status: 422 },
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json(
        { detail: "Campo 'file' ausente.", code: "FILE_MISSING" },
        { status: 422 },
      );
    }
    const upstream = new FormData();
    upstream.append("material_external_id", materialExternalId);
    upstream.append("file", file, file.name);
    const ack = await djangoFetch("/api/v1/collaborators/training/submissions/audio", {
      method: "POST",
      body: upstream as unknown as BodyInit,
    });
    return NextResponse.json(ack);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao enviar o áudio.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
