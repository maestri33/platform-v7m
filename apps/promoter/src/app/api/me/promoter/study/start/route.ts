/**
 * POST /api/me/promoter/study/start — auto-matrícula do promotor (SEM comissão).
 * Backend: `POST /api/v1/collaborators/promoter/study/start` — devolve o
 * checkout (`checkout_url` / `qrcode_*`). Pago → o backend dá a role de aluno
 * (o wizard do aluno mora no app do cliente).
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const data = await djangoFetch("/api/v1/collaborators/promoter/study/start", {
      method: "POST",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao iniciar sua matrícula.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
