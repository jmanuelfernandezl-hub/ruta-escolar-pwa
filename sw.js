// v3: "caché primero y actualizar en segundo plano".
// La app abre al instante aunque la señal sea mala o inexistente (nunca espera a la red).
// Mientras tanto revisa si hay una versión nueva y, si la hay, avisa a la app para que
// muestre el botón «Hay una versión nueva · toca para actualizar».
const CACHE_NAME = 'ruta-escolar-v3';
const INDEX_URL = new URL('./index.html', self.location).href;
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

async function notifyClients() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((c) => c.postMessage({ type: 'UPDATE_AVAILABLE' }));
}

// Pide la versión más reciente al servidor (revalidando, sin usar copias viejas del
// navegador). Si funciona, la guarda; si la app cambió, avisa. Si falla, devuelve null.
async function revalidate(key, url, cache, previous) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res || !res.ok) return null;
    const forCache = res.clone();
    const forCompare = res.clone();
    await cache.put(key, forCache);
    if (previous) {
      const [a, b] = await Promise.all([previous.text(), forCompare.text()]);
      if (a !== b) await notifyClients();
    }
    return res;
  } catch (e) {
    return null;
  }
}

function offlineResponse() {
  return new Response('Sin conexión y sin copia guardada de la app. Abre la app una vez con internet.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function handle(event) {
  const req = event.request;
  const isNav = req.mode === 'navigate';
  // Cualquier navegación dentro de la app se resuelve con la misma página guardada.
  const key = isNav ? INDEX_URL : req.url;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(key);

  if (cached) {
    event.waitUntil(revalidate(key, key, cache, isNav ? cached.clone() : null));
    return cached;                       // inmediato, sin esperar a la red
  }
  const res = await revalidate(key, key, cache, null);
  if (res) return res;
  return offlineResponse();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Todo lo externo (Supabase, direcciones, mapas, Waze, fuentes, Leaflet...)
  // va directo a la red, sin intervenir.
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(handle(event));
});
