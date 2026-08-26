import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "hub-v7m",
    timestamp: new Date().toISOString(),
    sha: process.env.GIT_SHA || "dev",
  });
}
