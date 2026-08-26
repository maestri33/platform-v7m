/**
 * Mídia vinda do backend (selfie, foto/vídeo das aulas) só pode ser exibida
 * através do proxy de mesma origem — a CSP do app não libera host externo e o
 * cookie de sessão é do domínio do app. Ver `app/api/me/media/route.ts`.
 */

/**
 * URL exibível para uma mídia do backend. `data:`/`blob:` passam direto (já são
 * locais); vazio/inválido devolve `null` para o chamador não renderizar
 * `<img src="">`.
 */
export function mediaProxyUrl(src: string | null | undefined): string | null {
  if (typeof src !== "string") return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;
  // Só http(s) absoluto ou caminho do backend — o route handler revalida.
  if (!/^(https?:\/\/|\/)/i.test(trimmed)) return null;
  return `/api/me/media?src=${encodeURIComponent(trimmed)}`;
}
