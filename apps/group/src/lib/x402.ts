import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

export const X402_FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://facilitator.x402.org";

export const X402_PAY_TO_ADDRESS =
  process.env.X402_PAY_TO_ADDRESS || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";

export const X402_NETWORK = "eip155:8453"; // Base Mainnet
export const X402_USDC_ASSET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

export function createX402Server() {
  const facilitator = new HTTPFacilitatorClient({ url: X402_FACILITATOR_URL });
  const server = new x402ResourceServer(facilitator);
  // register scheme server
  server.register(X402_NETWORK as any, new ExactEvmScheme() as any);
  return { facilitator, server };
}

export function buildX402PaymentPayload(resource: string, description: string, amount: string = "1000") {
  return {
    x402Version: 2,
    accepts: [
      {
        scheme: "exact",
        network: X402_NETWORK,
        amount,
        resource,
        description,
        mimeType: "application/json",
        payTo: X402_PAY_TO_ADDRESS,
        maxTimeoutSeconds: 300,
        asset: X402_USDC_ASSET,
        extra: {
          name: "USDC",
          version: "2",
          label: "API",
        },
      },
    ],
    error: "Payment required to access this resource",
  };
}

export function buildX402Headers(payload: ReturnType<typeof buildX402PaymentPayload>) {
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Payment-Required, X-Payment-Required, Accept-Payment",
    "Accept-Payment": `x402; network=${X402_NETWORK}; asset=USDC`,
    "Payment-Required": base64Payload,
    "X-Payment-Required": `x402; network=${X402_NETWORK}; asset=USDC; amount=${payload.accepts[0].amount}`,
  };
}
