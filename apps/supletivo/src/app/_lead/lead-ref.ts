/**
 * Memória de atribuição (ref de afiliado + UTMs + click IDs + Pixel cookies).
 * Alinhado a 90 dias com a landing page supletivo.net.br.
 */

export interface LeadAttributionData {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  landing_url?: string;
}

const COOKIE_REF = "supletivo.ref";
const COOKIE_ATTR = "supletivo.attr";
const MAX_AGE_S = 90 * 24 * 60 * 60; // 90 dias

function cookieDomain(): string {
  try {
    const host = window.location.hostname;
    if (host === "supletivo.net.br" || host.endsWith(".supletivo.net.br")) {
      return "; domain=.supletivo.net.br";
    }
  } catch {}
  return "";
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(".", "\\.");
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  return m ? decodeURIComponent(m[1]).trim() : null;
}

function rememberRef(ref: string): void {
  if (typeof document === "undefined") return;
  const domain = cookieDomain();
  document.cookie = `${COOKIE_REF}=${encodeURIComponent(ref)}; max-age=${MAX_AGE_S}; path=/${domain}; samesite=lax`;
}

function recallRef(): string {
  return getCookie(COOKIE_REF) ?? "";
}

function recallStoredAttr(): Partial<LeadAttributionData> {
  const raw = getCookie(COOKIE_ATTR);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<LeadAttributionData>;
  } catch {
    return {};
  }
}

function persistAttr(data: LeadAttributionData): void {
  if (typeof document === "undefined") return;
  const domain = cookieDomain();
  try {
    const jsonStr = encodeURIComponent(JSON.stringify(data));
    document.cookie = `${COOKIE_ATTR}=${jsonStr}; max-age=${MAX_AGE_S}; path=/${domain}; samesite=lax`;
  } catch {}
  if (data.ref) {
    rememberRef(data.ref);
  }
}

/**
 * Resolve toda a atribuição presente na URL e cookies.
 * Lê query params (?ref=, ?utm_*, ?gclid=, ?fbclid=) e cookies Meta (_fbp, _fbc).
 */
export function resolveAttribution(): LeadAttributionData {
  if (typeof window === "undefined") return {};

  const search = new URLSearchParams(window.location.search);
  const stored = recallStoredAttr();

  const current: Partial<LeadAttributionData> = {};
  const refParam = search.get("ref")?.trim();
  if (refParam) current.ref = refParam;

  const utmKeys: Array<keyof LeadAttributionData> = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
  ];

  for (const k of utmKeys) {
    const val = search.get(k)?.trim();
    if (val) (current as Record<string, string>)[k] = val;
  }

  // Meta Pixel cookies
  const fbp = getCookie("_fbp");
  if (fbp) current.fbp = fbp;

  const fbc = getCookie("_fbc");
  if (fbc) current.fbc = fbc;

  if (window.location.href) {
    current.landing_url = window.location.href.split("#")[0];
  }

  // Se ref estiver na URL, sobrescreve o ref armazenado; senão mantém o armazenado ou recallRef
  const finalRef = current.ref || stored.ref || recallRef() || undefined;

  const merged: LeadAttributionData = {
    ...stored,
    ...current,
    ...(finalRef ? { ref: finalRef } : {}),
  };

  persistAttr(merged);
  return merged;
}

/**
 * Ref vigente na entrada do funil: wrapper mantido para compatibilidade.
 */
export function resolveEntryRef(): string {
  const attr = resolveAttribution();
  return attr.ref ?? "";
}
