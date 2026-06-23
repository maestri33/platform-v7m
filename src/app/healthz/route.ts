import { NextResponse } from "next/server";

// Health + proveniência: expõe o commit que está REALMENTE no ar.
// GIT_SHA/BUILD_AT são inlinados no build (ver next.config.ts `env`) a partir do
// que o deploy.yml exporta no momento do `npm run build`. Fica FORA do /api/*
// porque /api/* é rewrite pro backend Django (next.config.ts `rewrites`).
export const dynamic = "force-dynamic";

// BUILD_AT é gravado em UTC (ISO, ex.: 2026-06-23T18:57:37Z). Exibe no fuso de
// São Paulo (America/Sao_Paulo, BRT/-03) pra leitura local; se vier "unknown" ou
// não-parseável, devolve como está.
function builtAtSaoPaulo(): string {
  const raw = process.env.BUILD_AT ?? "unknown";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export function GET() {
  return NextResponse.json({
    status: "ok",
    sha: process.env.GIT_SHA ?? "unknown",
    builtAt: builtAtSaoPaulo(),
  });
}
