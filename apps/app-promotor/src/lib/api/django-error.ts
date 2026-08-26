/** Converte um erro do Django (ou desconhecido) numa Response JSON no mesmo shape. */
import { NextResponse } from "next/server";

import { DjangoError } from "./client";

export function djangoErrorResponse(err: unknown): NextResponse {
  if (err instanceof DjangoError) {
    return NextResponse.json(err.body, { status: err.status });
  }
  return NextResponse.json(
    { detail: "Erro interno do servidor.", code: "INTERNAL" },
    { status: 500 },
  );
}
