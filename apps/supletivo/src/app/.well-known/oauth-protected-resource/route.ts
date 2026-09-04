import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "app.supletivo.net.br";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;

  const metadata = {
    resource: `${origin}/`,
    resource_name: "Portal do Aluno Supletivo Brasil",
    authorization_servers: [
      "https://v7m.cloudflareaccess.com",
      `${origin}/`,
    ],
    scopes_supported: [
      "openid",
      "email",
      "profile",
      "clients:read",
      "clients:write",
      "student",
      "enrollment",
    ],
    bearer_methods_supported: [
      "header",
    ],
    resource_documentation: `${origin}/termos`,
  };

  return NextResponse.json(metadata, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
