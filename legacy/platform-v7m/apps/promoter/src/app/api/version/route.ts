/**
 * GET /api/version — marcador de diagnóstico do deploy: expõe o BUILD_ID do
 * bundle EM EXECUÇÃO, pra conferir se o domínio público aponta pro build
 * recém-deployado (compare com `.next/BUILD_ID` no servidor). Sem segredo,
 * sem auth — o BUILD_ID já aparece nas URLs dos assets de qualquer página.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Vale pros dois modos: `next start` (cwd = raiz do projeto) e standalone
  // (cwd = .next/standalone) — nos dois, o arquivo mora em `<cwd>/.next/BUILD_ID`.
  let buildId = "unknown";
  try {
    buildId = (
      await readFile(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8")
    ).trim();
  } catch {
    // sem BUILD_ID legível (dev server) — segue "unknown"
  }
  return NextResponse.json({ build_id: buildId });
}
