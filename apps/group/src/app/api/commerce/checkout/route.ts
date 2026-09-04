import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { createX402Server, X402_NETWORK, X402_PAY_TO_ADDRESS } from "@/lib/x402";

export const dynamic = "force-dynamic";

const { server } = createX402Server();

const handler = async (_request: NextRequest) => {
  return NextResponse.json({
    status: "settled",
    message: "Agent checkout successfully processed via x402 payment protocol",
    timestamp: new Date().toISOString(),
  });
};

export const POST = withX402(
  handler,
  {
    "/api/commerce/checkout": {
      accepts: {
        scheme: "exact",
        payTo: X402_PAY_TO_ADDRESS,
        price: "$0.05",
        network: X402_NETWORK as any,
      },
      description: "Agent checkout for student enrollment or course voucher",
    },
  },
  server,
  undefined,
  undefined,
  false
);
