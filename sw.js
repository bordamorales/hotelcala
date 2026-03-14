// ═══════════════════════════════════════════════
//  HOTEL CALA · Service Worker v1
//  Cache para funcionamiento offline
// ═══════════════════════════════════════════════

const CACHE_NAME = 'hotelcala-v1';
const CACHE_STATIC = [
  '/',
  '/index.html',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
];

// Instalar — cachear recursos estáticos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_STATIC))
      .then(() => self.skipWaiting())
  );
});

// Activar — limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — estrategia: Network first, cache fallback
self.addEventListener('fetch', e => {
  // No interceptar llamadas al GAS (siempre necesitan red)
  if (e.request.url.includes('script.google.com')) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Guardar copia en cache si la respuesta es válida
        if (res && res.status === 200 && res.type !== 'opaque') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => {
        // Sin red — servir desde cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Fallback al index.html para rutas de la app
          return caches.match('/') || caches.match('/index.html');
        });
      })
  );
});

// Mensaje desde la app para forzar actualización
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
