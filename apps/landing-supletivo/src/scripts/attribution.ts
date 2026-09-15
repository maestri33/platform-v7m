/**
 * Captura e persistência de atribuição (ref de afiliado + UTMs + click ids).
 *
 * Regras:
 *  - first-touch para `ref`: o primeiro ref capturado vence e NÃO é sobrescrito
 *    por visitas sem ref; um novo ref explícito na URL sobrescreve.
 *  - persistência dupla: localStorage (`sb_attribution`, JSON com timestamp)
 *    + cookie first-party (`sb_ref`, 90 dias, SameSite=Lax) como redundância.
 *  - todos os links <a data-cta> são reescritos no client para repassar os
 *    parâmetros ao app. Sem JS os CTAs seguem funcionando (href limpo no HTML).
 */

export const ATTR_KEYS = [
  'ref',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
] as const;

type AttrKey = (typeof ATTR_KEYS)[number];
export type Attribution = Partial<Record<AttrKey, string>> & { ts?: number };

const LS_KEY = 'sb_attribution';
const COOKIE_NAME = 'sb_ref';
const ATTR_COOKIE_NAME = 'supletivo.attr';
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 dias
const LS_MAX_AGE_MS = COOKIE_MAX_AGE * 1000; // localStorage expira junto do cookie

function cookieDomain(): string {
  try {
    const host = window.location.hostname;
    if (host === 'supletivo.net.br' || host.endsWith('.supletivo.net.br')) {
      return ';domain=.supletivo.net.br';
    }
  } catch {}
  return '';
}

function readCookieAttr(): Attribution | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${ATTR_COOKIE_NAME.replace('.', '\\.')}=([^;]+)`));
    if (!m) return null;
    const data = JSON.parse(decodeURIComponent(m[1])) as Attribution;
    if (data.ts && Date.now() - data.ts > LS_MAX_AGE_MS) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function readStored(): Attribution | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Attribution;
      if (!data.ts || Date.now() - data.ts <= LS_MAX_AGE_MS) {
        return data;
      }
      localStorage.removeItem(LS_KEY);
    }
  } catch {
    /* armazenamento indisponível */
  }
  return readCookieAttr();
}

function readCookieRef(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function persist(data: Attribution): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    /* armazenamento indisponível (modo privado etc.) — cookie cobre o blob */
  }
  const domainAttr = cookieDomain();
  try {
    const jsonStr = encodeURIComponent(JSON.stringify(data));
    document.cookie = `${ATTR_COOKIE_NAME}=${jsonStr};max-age=${COOKIE_MAX_AGE};path=/${domainAttr};SameSite=Lax`;
  } catch {}
  if (data.ref) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(data.ref)};max-age=${COOKIE_MAX_AGE};path=/${domainAttr};SameSite=Lax`;
  }
}

function fromUrl(search: string): Attribution {
  const params = new URLSearchParams(search);
  const out: Attribution = {};
  for (const key of ATTR_KEYS) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
}

/**
 * Resolve a atribuição vigente (URL atual vs. armazenada) e persiste.
 * `search` é injetável para testes; default = URL atual.
 */
export function initAttribution(search: string = location.search): Attribution | null {
  const current = fromUrl(search);
  let stored = readStored();

  // Redundância: localStorage perdido mas cookie sobreviveu
  if (!stored?.ref) {
    const cookieRef = readCookieRef();
    if (cookieRef) stored = { ...(stored ?? {}), ref: cookieRef };
  }

  let final: Attribution | null;
  if (current.ref) {
    // ref explícito na URL sempre sobrescreve
    final = { ...current, ts: Date.now() };
    persist(final);
  } else if (stored?.ref) {
    // first-touch: mantém o que já foi capturado
    final = stored;
  } else if (Object.keys(current).length > 0) {
    // sem ref, mas com UTMs/click ids novos — captura mesmo assim
    final = { ...(stored ?? {}), ...current, ts: Date.now() };
    persist(final);
  } else {
    final = stored;
  }

  return final && Object.keys(final).length > 0 ? final : null;
}

/** Reescreve todos os CTAs anexando os parâmetros capturados. */
export function decorateCtas(attr: Attribution | null): void {
  if (!attr) return;
  document.querySelectorAll<HTMLAnchorElement>('a[data-cta]').forEach((a) => {
    try {
      const url = new URL(a.href);
      for (const key of ATTR_KEYS) {
        const value = attr[key];
        if (value) url.searchParams.set(key, value);
      }
      a.href = url.toString();
    } catch {
      /* href inválido — mantém como está */
    }
  });
}
