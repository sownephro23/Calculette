// Nom du cache. Changez la version (v4, v5...) si vous modifiez des fichiers pour forcer la mise à jour.
const STATIC_CACHE_NAME = 'nephrocalc-static-cache-v4';
const DYNAMIC_CACHE_NAME = 'nephrocalc-dynamic-cache-v4';

// Fichiers essentiels de l'application à mettre en cache immédiatement.
// Les chemins sont à la racine, comme dans le manifest.json
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Événement d'installation
self.addEventListener('install', event => {
  console.log('[Service Worker] Installation...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('[Service Worker] Mise en cache de la coquille applicative');
      return cache.addAll(APP_SHELL_FILES);
    })
  );
});

// Événement d'activation
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activation...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Événement fetch : gère les requêtes
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Stratégie: Cache-First pour la vitesse
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Si non trouvé dans le cache, aller sur le réseau
        return fetch(event.request).then(
          networkResponse => {
            // Mettre la nouvelle réponse dans le cache dynamique
            return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
              // On ne met en cache que les requêtes GET valides
              if (event.request.method === 'GET' && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            });
          }
        );
      })
      .catch(error => {
        console.log('[Service Worker] Erreur de Fetch. L\'appareil est probablement hors ligne et la ressource n\'est pas dans le cache.', error);
        // Optionnel: vous pourriez retourner une page "offline.html" ici si vous en aviez une.
      })
  );
});
