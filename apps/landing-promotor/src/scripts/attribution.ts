/**
 * Captura e persistência de atribuição do recrutamento (polo/hub + UTMs).
 *
 * Diferente da landing de aluno: aqui o vínculo é com o POLO. A URL pública
 * usa ?hub=<polo> (nome próprio, não colide com o ?ref= do link de trabalho do
 * promotor). `ref` é aceito como alias de entrada. No clique do CTA, o valor é
 * repassado ao app como ?ref=<polo> — parâmetro consumido por create_candidate.
 *
 * Regras:
 *  - first-touch para o polo: o primeiro hub/ref capturado vence e NÃO é
 *    sobrescrito por visitas sem polo; um novo hub/ref explícito sobrescreve.
 *  - persistência dupla: localStorage (`pr_attribution`, JSON com timestamp)
 *    + cookie first-party (`pr_hub`, 90 dias, SameSite=Lax) como redundância.
 *  - todos os <a data-cta> são reescritos no client para repassar os parâmetros.
 *    Sem JS os CTAs seguem funcionando (href limpo no HTML).
 */
import { APP_REF_PARAM } from '../config';

export const ATTR_KEYS = [
  'hub',
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

/** Parâmetros encaminhados ao app sem tradução (o polo é tratado à parte) */
const PASS_THROUGH: AttrKey[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
];

const LS_KEY = 'pr_attribution';
const COOKIE_NAME = 'pr_hub';
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 dias
const LS_MAX_AGE_MS = COOKIE_MAX_AGE * 1000; // localStorage expira junto do cookie

/** Valor do polo capturado (hub tem precedência; ref é alias) */
export function poloValue(attr: Attribution | null): string | null {
  return attr?.hub ?? attr?.ref ?? null;
}

function readStored(): Attribution | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Attribution;
    // coerência com o cookie: atribuição com mais de 90 dias não vale mais
    if (data.ts && Date.now() - data.ts > LS_MAX_AGE_MS) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function readCookieHub(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function persist(data: Attribution): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    /* armazenamento indisponível (modo privado etc.) — cookie cobre o polo */
  }
  const polo = poloValue(data);
  if (polo) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(polo)};max-age=${COOKIE_MAX_AGE};path=/;SameSite=Lax`;
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
  if (!poloValue(stored)) {
    const cookieHub = readCookieHub();
    if (cookieHub) stored = { ...(stored ?? {}), hub: cookieHub };
  }

  let final: Attribution | null;
  if (poloValue(current)) {
    // polo explícito na URL sempre sobrescreve
    final = { ...current, ts: Date.now() };
    persist(final);
  } else if (poloValue(stored)) {
    // first-touch: mantém o que já foi capturado
    final = stored;
  } else if (Object.keys(current).length > 0) {
    // sem polo, mas com UTMs/click ids novos — captura mesmo assim
    final = { ...(stored ?? {}), ...current, ts: Date.now() };
    persist(final);
  } else {
    final = stored;
  }

  return final && Object.keys(final).length > 0 ? final : null;
}

/**
 * Reescreve todos os CTAs anexando os parâmetros capturados.
 * O polo (hub/ref) é enviado ao app como APP_REF_PARAM (ref).
 */
export function decorateCtas(attr: Attribution | null): void {
  if (!attr) return;
  const polo = poloValue(attr);
  document.querySelectorAll<HTMLAnchorElement>('a[data-cta]').forEach((a) => {
    try {
      const url = new URL(a.href);
      if (polo) url.searchParams.set(APP_REF_PARAM, polo);
      for (const key of PASS_THROUGH) {
        const value = attr[key];
        if (value) url.searchParams.set(key, value);
      }
      a.href = url.toString();
    } catch {
      /* href inválido — mantém como está */
    }
  });
}
