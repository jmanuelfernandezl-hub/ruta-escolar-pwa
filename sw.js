### 2. `sw.js` (Service Worker)
```javascript
const CACHE_NAME = 'ruta-escolar-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Direcciones, mapas y Waze siempre necesitan la red: no se cachean.
  if (
    url.includes('nominatim.openstreetmap.org') ||
    url.includes('tile.openstreetmap.org') ||
    url.includes('waze.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) {
    return;
  }

  // El resto (la app en sí) funciona sin conexión: se sirve del caché primero.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
