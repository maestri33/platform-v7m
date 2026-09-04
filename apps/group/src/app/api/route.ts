import { NextRequest, NextResponse } from "next/server";
import { buildX402Headers, buildX402PaymentPayload } from "@/lib/x402";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const resource = request.url.split("?")[0];
  const payload = buildX402PaymentPayload(
    resource,
    "V7M Educational & Commercial agent API, payable via x402 on Base (USDC)."
  );
  const headers = buildX402Headers(payload);

  return NextResponse.json(payload, {
    status: 402,
    headers,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Payment, Payment-Required",
      "Access-Control-Expose-Headers": "Payment-Required, X-Payment-Required, Accept-Payment",
    },
  });
}
