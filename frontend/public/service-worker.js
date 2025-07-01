// Service Worker para control de caché y actualizaciones
const CACHE_NAME = 'reach-uaa-cache-v1';
const DYNAMIC_CACHE_NAME = 'reach-uaa-dynamic-cache-v1';

// Archivos a cachear inicialmente
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/assets/logo_reach.webp',
  '/src/assets/logo_reach_1.webp'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Forzar la activación inmediata
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, DYNAMIC_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Tomar control de los clientes inmediatamente
  );
});

// Estrategia de caché: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  // Ignorar solicitudes a la API
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Ignorar solicitudes de análisis o seguimiento
  if (event.request.url.includes('analytics') || 
      event.request.url.includes('tracking')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar la respuesta para poder usarla y guardarla en caché
        const responseToCache = response.clone();
        
        // Solo cachear solicitudes exitosas
        if (response.status === 200) {
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        
        return response;
      })
      .catch(() => {
        // Si la red falla, intentar desde el caché
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            
            // Si no está en caché y es una solicitud de página, devolver la página principal
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // Si no está en caché y no es una página, devolver un error
            return new Response('No hay conexión a Internet', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Escuchar mensajes para actualizar el caché
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Limpiando caché:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});