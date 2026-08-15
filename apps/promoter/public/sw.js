// Service worker mínimo e CONSERVADOR (app atrás de auth por cookie).
// Regra de ouro: NUNCA cachear /api/* nem HTML (são respostas autenticadas via
// cookie HttpOnly — cache vazaria sessão entre usuários do mesmo device).
// Só cacheia assets imutáveis do build (/_next/static, com hash no nome) em
// cache-first; todo o resto é network passthrough. Existe pra (a) tornar o app
// instalável (PWA) e (b) acelerar o carregamento dos estáticos — nada além.
const STATIC_CACHE = "v7m-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // limpa caches de versões antigas do SW
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Só estáticos imutáveis do build. /api/*, páginas e demais GETs: passthrough.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
  }
});
