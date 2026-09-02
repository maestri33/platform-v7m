import type { Pricing } from "@/lib/payment";

/**
 * Server-only. Uses URL_BACKEND (non-public env) — never import from a Client Component.
 * Direct upstream fetch (no proxy needed server-side).
 */
const URL_BACKEND = process.env.URL_BACKEND ?? "http://10.1.20.30";

export async function getPricing(): Promise<Pricing | null> {
  try {
    const res = await fetch(`${URL_BACKEND}/api/v1/clients/pricing`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Pricing;
  } catch {
    return null;
  }
}
