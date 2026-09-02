/* Service worker do Supletivo Brasil — cache offline simples + atualização limpa.
 *
 * Estratégia (mínima de propósito):
 *   - /api/*            → rede sempre (dados e sessão nunca são cacheados)
 *   - navegações (HTML) → network-first; cai pro cache / página offline sem rede
 *   - estáticos (mesma origem, ex.: /_next/static, ícones) → stale-while-revalidate
 *
 * O cache é versionado: ao ativar uma versão nova, os caches antigos são apagados,
 * então um deploy novo não fica preso em HTML velho.
 */
const VERSION = "v1";
const CACHE = `supletivo-${VERSION}`;
const OFFLINE_URL = "/";
const PRECACHE = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // cross-origin: deixa passar
  if (url.pathname.startsWith("/api/")) return; // dados/sessão: rede sempre

  // Navegações: network-first com fallback offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Estáticos: stale-while-revalidate (serve do cache e atualiza em segundo plano).
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
