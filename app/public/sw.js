const CACHE_NAME = 'revisor-arq-v2';
const STATIC_ASSETS = ['/offline'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Las API son siempre network-only: nunca cachear respuestas del chat.
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Las navegaciones usan la red primero para no congelar HTML de un deploy
  // anterior. Sin conexión, se entrega la página offline precargada.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline').then(
          (fallback) => fallback || new Response('Sin conexión', { status: 503 })
        )
      )
    );
    return;
  }

  // Next ya versiona y cachea sus assets mediante HTTP. El SW solo usa una
  // copia existente cuando la red falla.
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(
        (cached) => cached || new Response('Sin conexión', { status: 503 })
      )
    )
  );
});
