# x402 Payment Protocol Architecture & Implementation

## Overview

The **x402 protocol** (https://x402.org) revives the standard HTTP 402 status code to allow autonomous AI agents to negotiate, settle, and verify machine-to-machine payments without manual intervention or human checkout loops.

V7M implements the x402 specification across both its Next.js edge applications (`@x402/next`, `@x402/evm`), Cloudflare Pages edge functions, and Django backend gateway.

---

## Technical Specifications

- **Protocol Version**: 2 (`x402Version: 2`)
- **Scheme**: `exact`
- **Network**: Base Mainnet (`eip155:8453`)
- **Payment Asset**: USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- **Treasury Address**: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

---

## Endpoints

| Path | Purpose | Response Code |
| :--- | :--- | :--- |
| `/.well-known/x402.json` | Discovery Manifest | 200 OK |
| `/.well-known/x402` | Discovery Alias | 200 OK |
| `/api` | Gateway Entrypoint | 402 Payment Required |
| `/api/commerce/checkout` | Protected Route (`withX402`) | 402 Challenge / 200 Settled |

---

## Response Headers

When an agent requests a protected resource without payment proof:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json; charset=utf-8
Access-Control-Allow-Origin: *
Access-Control-Expose-Headers: Payment-Required, X-Payment-Required, Accept-Payment
Accept-Payment: x402; network=eip155:8453; asset=USDC
Payment-Required: <base64 encoded JSON>
X-Payment-Required: x402; network=eip155:8453; asset=USDC; amount=1000
```

---

## Verification

Backend tests:
```bash
$env:SECRET_KEY="test-secret-key-1234567890123456"
pytest tests/test_x402.py -v
```

Frontend type verification:
```bash
pnpm --filter @v7m/group check-types
pnpm --filter @v7m/supletivo check-types
```
