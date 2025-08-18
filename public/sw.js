self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('sayings-static-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.webmanifest',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => !['sayings-static-v1'].includes(n))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle GET and same-origin
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open('sayings-static-v1').then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

