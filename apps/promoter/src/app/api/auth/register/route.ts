/** POST /api/auth/register — cadastro público do candidato. */
import { NextResponse } from "next/server";

import { djangoFetch } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const data = await djangoFetch("/api/v1/collaborators/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
      authenticated: false,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return djangoErrorResponse(err);
  }
}
