/**
 * Web Bot Auth (IETF WebBotAuth WG & RFC 9421 HTTP Message Signatures).
 * Provides Ed25519 request signing and verification for bot and agent requests.
 */

export const DEFAULT_BOT_KEY_ID = "LvxIKIGSHek7sBRDwZtbkLA5pf-fb5wG1KnPU57n3Ek";
export const DEFAULT_BOT_PUBLIC_KEY_X = "UyKhqDygBx2HqqBB_isUzvgz4Qfzzz3kTxAP-QIpxqU";
export const DEFAULT_BOT_PRIVATE_KEY_D = "OG22BKXnhSQdatv5NiiQ9e2gNYN30pYcU0QO3n1B444";
export const DEFAULT_BOT_AGENT_URL = "https://maestri.group";

export interface BotJwkKey {
  kty: "OKP";
  crv: "Ed25519";
  x: string;
  kid: string;
}

export interface BotJwks {
  keys: BotJwkKey[];
}

export const DEFAULT_BOT_JWKS: BotJwks = {
  keys: [
    {
      kty: "OKP",
      crv: "Ed25519",
      x: DEFAULT_BOT_PUBLIC_KEY_X,
      kid: DEFAULT_BOT_KEY_ID,
    },
  ],
};

export interface SignBotRequestOptions {
  authority: string;
  agentUrl?: string;
  keyId?: string;
  privateKeyD?: string;
  publicKeyX?: string;
  label?: string;
  validitySeconds?: number;
  nonce?: string;
}

export interface BotAuthHeaders {
  "Signature-Agent": string;
  "Signature-Input": string;
  "Signature": string;
  [key: string]: string;
}

/**
 * Creates RFC 9421 HTTP Message Signature headers for outbound bot requests.
 */
export async function createBotAuthHeaders(options: SignBotRequestOptions): Promise<BotAuthHeaders> {
  const agentUrl = options.agentUrl ?? DEFAULT_BOT_AGENT_URL;
  const keyId = options.keyId ?? DEFAULT_BOT_KEY_ID;
  const privateKeyD = options.privateKeyD ?? DEFAULT_BOT_PRIVATE_KEY_D;
  const publicKeyX = options.publicKeyX ?? DEFAULT_BOT_PUBLIC_KEY_X;
  const label = options.label ?? "sig1";
  const validitySeconds = options.validitySeconds ?? 300;

  const now = Math.floor(Date.now() / 1000);
  const expires = now + validitySeconds;

  let nonce = options.nonce;
  if (!nonce) {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    nonce = Buffer.from(randomBytes).toString("base64");
  }

  // Structured string requires double quotes
  const sigAgentHeader = `"${agentUrl}"`;

  const sigParams = `("@authority" "signature-agent");created=${now};keyid="${keyId}";alg="ed25519";expires=${expires};nonce="${nonce}";tag="web-bot-auth"`;

  const cleanAuthority = options.authority.toLowerCase().split("/")[0];

  const sigBase = `"@authority": ${cleanAuthority}\n"signature-agent": ${sigAgentHeader}\n"@signature-params": ${sigParams}`;

  const jwk = {
    kty: "OKP" as const,
    crv: "Ed25519" as const,
    x: publicKeyX,
    d: privateKeyD,
  };

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "Ed25519" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign(
    { name: "Ed25519" },
    key,
    new TextEncoder().encode(sigBase),
  );

  const sigBase64 = Buffer.from(signatureBuffer).toString("base64");

  return {
    "Signature-Agent": sigAgentHeader,
    "Signature-Input": `${label}=${sigParams}`,
    Signature: `${label}=:${sigBase64}:`,
  };
}

/**
 * Middleware for openapi-fetch to automatically sign requests with Web Bot Auth.
 */
export function createWebBotAuthMiddleware(options: Partial<SignBotRequestOptions> = {}) {
  return {
    async onRequest({ request }: { request: Request }) {
      const url = new URL(request.url);
      const authority = url.host;
      const headers = await createBotAuthHeaders({
        authority,
        ...options,
      });

      for (const [key, value] of Object.entries(headers)) {
        request.headers.set(key, value);
      }
      return request;
    },
  };
}
