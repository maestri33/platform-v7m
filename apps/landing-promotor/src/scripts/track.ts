/**
 * Camada de eventos: dataLayer + track().
 * Nenhum pixel/tag instalado — GTM/GA4/Meta Pixel leem deste dataLayer
 * quando forem adicionados (ver comentário no <head> de Base.astro).
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

window.dataLayer = window.dataLayer || [];

export function track(eventName: string, payload: Record<string, unknown> = {}): void {
  window.dataLayer.push({ event: eventName, ...payload });
}
