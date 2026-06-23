import { NextResponse } from "next/server";

// Health + proveniência: expõe o commit que está REALMENTE no ar.
// GIT_SHA/BUILD_AT são inlinados no build (ver next.config.ts `env`) a partir do
// que o deploy.yml exporta no momento do `npm run build`. Fica FORA do /api/*
// porque /api/* é rewrite pro backend Django (next.config.ts `rewrites`).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    sha: process.env.GIT_SHA ?? "unknown",
    builtAt: process.env.BUILD_AT ?? "unknown",
  });
}
