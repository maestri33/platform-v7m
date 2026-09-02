/**
 * Memória do `?ref=` (atribuição de indicação) — cookie próprio de longa duração.
 *
 * O ref chegava só pela URL e morria em qualquer recarga/troca de rota/volta por
 * link limpo — o promotor trazia o lead e perdia a atribuição (auditoria
 * 2026-07-25, "buracos 1 e 2"). Regra: primeira chegada com `?ref=` grava o
 * cookie; daí em diante a URL manda quando presente e o cookie cobre o resto.
 * 60 dias: folga sobre o ciclo real de decisão (dias/semanas), sem virar rastro
 * eterno. SameSite=Lax — o link circula por WhatsApp (navegação top-level).
 */

const COOKIE = "supletivo.ref";
const MAX_AGE_S = 60 * 60 * 24 * 60; // 60 dias

function rememberRef(ref: string): void {
  document.cookie = `${COOKIE}=${encodeURIComponent(ref)}; max-age=${MAX_AGE_S}; path=/; samesite=lax`;
}

function recallRef(): string {
  const hit = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${COOKIE}=`));
  if (!hit) return "";
  try {
    return decodeURIComponent(hit.slice(COOKIE.length + 1)).trim();
  } catch {
    return "";
  }
}

/**
 * Ref vigente na entrada do funil: URL ganha (e re-grava o cookie — indicação
 * mais recente vale), cookie é a reserva. Só roda no cliente (efeito de mount).
 */
export function resolveEntryRef(): string {
  const fromUrl = new URLSearchParams(window.location.search).get("ref")?.trim() ?? "";
  if (fromUrl) {
    rememberRef(fromUrl);
    return fromUrl;
  }
  return recallRef();
}
