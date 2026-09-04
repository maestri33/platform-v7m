export const onRequest: PagesFunction = async () => {
  const payload = {
    x402Version: 2,
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        amount: "1000",
        resource: "https://supletivo.net.br/api",
        description:
          "V7M Supletivo Student & Enrollment agent API, payable via x402 on Base (USDC). Free discovery stays open at /openapi.json, /.well-known/* and /api/v1.",
        mimeType: "application/json",
        payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        maxTimeoutSeconds: 300,
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        extra: {
          name: "USDC",
          version: "2",
          label: "API",
        },
      },
    ],
    error: "Payment required to access this resource",
  };

  const bodyStr = JSON.stringify(payload, null, 2);
  const base64Payload = btoa(JSON.stringify(payload));

  return new Response(bodyStr, {
    status: 402,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers":
        "Payment-Required, X-Payment-Required, Accept-Payment",
      "Accept-Payment": "x402; network=eip155:8453; asset=USDC",
      "Payment-Required": base64Payload,
      "X-Payment-Required":
        "x402; network=eip155:8453; asset=USDC; amount=1000",
      "Cache-Control": "no-store, no-cache",
    },
  });
};
