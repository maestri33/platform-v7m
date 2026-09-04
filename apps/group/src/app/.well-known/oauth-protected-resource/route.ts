import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "app.maestri.group";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;

  const metadata = {
    resource: `${origin}/`,
    resource_name: "V7M Group Unified Portal",
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
      "collaborators:read",
      "collaborators:write",
      "staff:read",
      "staff:write",
      "leadership:read",
      "leadership:write",
    ],
    bearer_methods_supported: [
      "header",
    ],
    resource_documentation: `${origin}/docs`,
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
