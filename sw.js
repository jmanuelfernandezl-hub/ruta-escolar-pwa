// v2: primero red, luego caché. Así las copias instaladas siempre reciben la
// versión más reciente cuando hay internet, y siguen funcionando sin conexión.
const CACHE_NAME = 'ruta-escolar-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL.map((u) => new Request(u, { cache: 'reload' })))
    )
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
  const req = event.request;
  if (req.method !== 'GET') return;

  // Todo lo externo (Supabase, direcciones, mapas, Waze, fuentes, Leaflet...)
  // va directo a la red, sin intervenir.
  if (new URL(req.url).origin !== self.location.origin) return;

  // Archivos de la app: red primero (siempre lo más nuevo), caché si no hay conexión.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
