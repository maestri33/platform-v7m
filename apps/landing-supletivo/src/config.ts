/**
 * Destino único de todos os CTAs da página.
 * Configurável via PUBLIC_APP_URL (.env). Fallbacks:
 *  - dev:   http://localhost:3000
 *  - build: https://app.supletivo.net.br
 */
const rawAppUrl =
  import.meta.env.PUBLIC_APP_URL ??
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://app.supletivo.net.br');

// sem barra final: evita ref colado em path duplicado e 301 no destino
export const APP_URL: string = rawAppUrl.replace(/\/+$/, '');

export const BRAND = 'Supletivo Brasil';

/** Texto único de CTA em toda a página (regra de copy) */
export const CTA_LABEL = 'Quero meu diploma';

/** Site institucional da empresa (Maestri Group) */
export const COMPANY_URL = 'https://maestri.group';
/** Página de captação de promotores / parceiros */
export const CAREERS_URL = 'https://maestri.group';
